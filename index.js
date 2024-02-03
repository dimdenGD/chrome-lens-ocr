import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type';
import { imageDimensionsFromData } from 'image-dimensions';
import { LENS_ENDPOINT, MIME_TO_EXT, SUPPORTED_MIMES } from './consts.js';
import sharp from 'sharp';

const setDefault = (obj, key, value) => {
    if(!obj[key]) {
        obj[key] = value;
    }
}

export default class Lens {
    constructor(config = {}) {
        const chromeVersion = '121.0.6167.140';
        const majorChromeVersion = chromeVersion.split('.')[0];

        setDefault(config, 'chromeVersion', chromeVersion);
        setDefault(config, 'majorChromeVersion', majorChromeVersion);
        setDefault(config, 'sbisrc', `Google Chrome ${chromeVersion} (Official) Windows`);
        setDefault(config, 'userAgent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        setDefault(config, 'endpoint', LENS_ENDPOINT);
        setDefault(config, 'viewport', [1920, 1080]); // [width, height]
        setDefault(config, 'headers', {});

        this.config = config;
    }

    async fetch(formdata) {
        const params = new URLSearchParams();

        params.append('s', 4); // SurfaceProtoValue - Surface.CHROMIUM
        params.append('re', 'df'); // RenderingEnvironment - DesktopWebFullscreen
        params.append('stcs', Date.now()); // timestamp
        params.append('vpw', this.config.viewport[0]); // viewport width
        params.append('vph', this.config.viewport[1]); // viewport height
        params.append('ep', 'subb'); // EntryPoint

        const url = `${this.config.endpoint}?${params.toString()}`;
        const headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Origin': 'https://lens.google.com',
            'Referer': 'https://lens.google.com/',
            'Sec-Ch-Ua': `"Not A(Brand";v="99", "Google Chrome";v="${this.config.majorChromeVersion}", "Chromium";v="${this.config.majorChromeVersion}"`,
            'Sec-Ch-Ua-Arch': '"x86"',
            'Sec-Ch-Ua-Bitness': '"64"',
            'Sec-Ch-Ua-Full-Version': `"${this.config.chromeVersion}"`,
            'Sec-Ch-Ua-Full-Version-List': `"Not A(Brand";v="99.0.0.0", "Google Chrome";v="${this.config.majorChromeVersion}", "Chromium";v="${this.config.majorChromeVersion}"`,
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Model': '""',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Ch-Ua-Platform-Version': '"15.0.0"',
            'Sec-Ch-Ua-Wow64': '?0',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': this.config.userAgent,
            'X-Client-Data': 'CIW2yQEIorbJAQipncoBCIH+ygEIlqHLAQjtocsBCPWYzQEIhaDNAQjd7M0BCMruzQEIg/DNAQjW8c0BCIDyzQEIz/TNAQiQ9c0BCLb3zQEYp+rNARib+M0BGMr4zQE='
            /*
                X-Client-Data: CIW2yQEIorbJAQipncoBCIH+ygEIlqHLAQjtocsBCPWYzQEIhaDNAQjd7M0BCMruzQEIg/DNAQjW8c0BCIDyzQEIz/TNAQiQ9c0BCLb3zQEYp+rNARib+M0BGMr4zQE=
                Decoded:
                message ClientVariations {
                    // Active client experiment variation IDs.
                    repeated int32 variation_id = [3300101, 3300130, 3313321, 3325697, 3330198, 3330285, 3361909, 3362821, 3372637, 3372874, 3373059, 3373270, 3373312, 3373647, 3373712, 3374006];
                    // Active client experiment variation IDs that trigger server-side behavior.
                    repeated int32 trigger_variation_id = [3372327, 3374107, 3374154];
                }
            */
        }

        for(const key in this.config.headers) {
            headers[key] = this.config.headers[key];
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formdata,
        });

        const af_data = this.getAFData(await response.text());
        const full_text = this.getFullText(af_data);

        return full_text;
    }

    getAFData(text) {
        const callbacks = text.match(/AF_initDataCallback\((\{.*?\})\)/gms);
        const lens_callback = callbacks.find(c => c.includes('DetectedObject'));

        if(!lens_callback) {
            console.log(callbacks);
            throw new Error('Could not find matching AF_initDataCallback');
        }

        const match = lens_callback.match(/AF_initDataCallback\((\{.*?\})\)/ms);

        return eval(`(${match[1]})`);
    }
    getFullText(af_data) {
        const data = af_data.data;
        const full_text_part = data[3];

        const language = full_text_part[3];
        const text_parts = full_text_part[4][0][0];
    
        return {
            language,
            text_segments: text_parts
        };
    }

    async scanByFile(path) {
        const file = await fs.promises.readFile(path);
        
        return this.scanByBuffer(file, path.split('/').pop());
    }

    async scanByBuffer(buffer, name) {
        const fileType = await fileTypeFromBuffer(buffer);

        if (!fileType || !SUPPORTED_MIMES.includes(fileType.mime)) {
            throw new Error('File type not supported');
        }

        if(!name) {
            const ext = MIME_TO_EXT[fileType.mime];
            name = `image.${ext}`;
        }

        const dimensions = imageDimensionsFromData(Uint8Array.from(buffer));
        if(!dimensions) {
            throw new Error('Could not determine image dimensions');
        }

        if(dimensions.width > 1000 || dimensions.height > 1000) {
            buffer = await sharp(buffer)
                .resize(1000, 1000, { fit: "inside" })
                .withMetadata()
                .jpeg({ quality: 90, progressive: true })
                .toBuffer();
            
            let newDimensions = imageDimensionsFromData(Uint8Array.from(buffer));
            if(!newDimensions) {
                throw new Error('Could not determine new image dimensions');
            }

            dimensions.width = newDimensions.width;
            dimensions.height = newDimensions.height;
        }

        const file = new File([buffer], name, { type: fileType.mime });
        const formdata = new FormData();

        formdata.append('encoded_image', file);
        formdata.append('original_width', dimensions.width);
        formdata.append('original_height', dimensions.height);
        formdata.append('processed_image_dimensions', `${dimensions.width},${dimensions.height}`);

        return this.fetch(formdata);
    }
    async scanByURL(url) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();

        return this.scanByBuffer(Buffer.from(buffer), url.split('/').pop());
    }
}