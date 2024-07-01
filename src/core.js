import { imageDimensionsFromData } from 'image-dimensions';
import setCookie from 'set-cookie-parser';
import { LENS_API_ENDPOINT, LENS_ENDPOINT, MIME_TO_EXT, SUPPORTED_MIMES } from './consts.js';
import { parseCookies, sleep } from './utils.js';

export class BoundingBox {
    #imageDimensions;
    constructor(box, imageDimensions) {
        if(!box) throw new Error('Bounding box not set');
        if(!imageDimensions || imageDimensions.length !== 2) throw new Error('Image dimensions not set');

        this.#imageDimensions = imageDimensions;

        this.centerPerX = box[0];
        this.centerPerY = box[1];
        this.perWidth = box[2];
        this.perHeight = box[3];
        this.pixelCoords = this.#toPixelCoords();
    }
    #toPixelCoords() {
        const [imgWidth, imgHeight] = this.#imageDimensions;

        const width = this.perWidth * imgWidth;
        const height = this.perHeight * imgHeight;

        const x = (this.centerPerX * imgWidth) - (width / 2);
        const y = (this.centerPerY * imgHeight) - (height / 2);

        return {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height)
        };
    }
}

export class LensError extends Error {
    constructor(message, code, headers, body) {
        super(message);
        this.name = 'LensError';
        this.code = code;
        this.headers = headers;
        this.body = body;
    }
}

export class Segment {
    constructor(text, boundingBox, imageDimensions) {
        this.text = text;
        this.boundingBox = new BoundingBox(boundingBox, imageDimensions);
    }
}

export class LensResult {
    constructor(language, segments) {
        this.language = language;
        this.segments = segments;
    }
}

export default class LensCore {
    #config = {};
    cookies = {};
    _fetch = globalThis.fetch && globalThis.fetch.bind(globalThis);

    constructor(config = {}, fetch) {
        if (typeof config !== 'object') {
            throw new TypeError('Lens constructor expects an object');
        }

        if (fetch) this._fetch = fetch;

        const chromeVersion = config?.chromeVersion ?? '124.0.6367.60';
        const majorChromeVersion = config?.chromeVersion?.split('.')[0] ?? chromeVersion.split('.')[0];

        this.#config = {
            chromeVersion,
            majorChromeVersion,
            sbisrc: `Google Chrome ${chromeVersion} (Official) Windows`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            endpoint: LENS_ENDPOINT,
            viewport: [1920, 1080],
            headers: {},
            fetchOptions: {},
            ...config
        };

        // lowercase all headers
        for (const key in this.#config.headers) {
            const value = this.#config.headers[key];
            if (!value) {
                delete this.#config.headers[key];
                continue;
            }
            if (key.toLowerCase() !== key) {
                delete this.#config.headers[key];
                this.#config.headers[key.toLowerCase()] = value;
            }
        }

        this.#parseCookies();
    }

    updateOptions(options) {
        for (const key in options) {
            this.#config[key] = options[key];
        }

        this.#parseCookies();
    }

    async fetch(options = {}, originalDimensions = [0, 0], secondTry = false) {
        const url = new URL(options.endpoint || this.#config.endpoint)
        const params = url.searchParams

        params.append('s', '' + 4); // SurfaceProtoValue - Surface.CHROMIUM
        params.append('re', 'df'); // RenderingEnvironment - DesktopWebFullscreen
        params.append('stcs', '' + Date.now()); // timestamp
        params.append('vpw', this.#config.viewport[0]); // viewport width
        params.append('vph', this.#config.viewport[1]); // viewport height
        params.append('ep', 'subb'); // EntryPoint

        const headers = this.#generateHeaders();

        for (const key in this.#config.headers) {
            headers[key] = this.#config.headers[key];
        }

        this.#generateCookieHeader(headers);

        const response = await this._fetch(String(url), {
            headers,
            redirect: 'manual',
            ...options,
            ...this.#config.fetchOptions
        });

        const text = await response.text();

        this.#setCookies(response.headers.get('set-cookie'));

        // in some of the EU countries, Google requires cookie consent
        if (response.status === 302) {
            if (secondTry) {
                throw new LensError('Lens returned a 302 status code twice', response.status, response.headers, text);
            }

            const consentHeaders = this.#generateHeaders();
            consentHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
            consentHeaders.Referer = 'https://consent.google.com/';
            consentHeaders.Origin = 'https://consent.google.com';

            this.#generateCookieHeader(consentHeaders);

            const location = response.headers.get('Location');

            if (!location) throw new Error('Location header not found');

            const redirectLink = new URL(location);
            const params = redirectLink.searchParams;
            params.append('x', '6');
            params.append('set_eom', 'true');
            params.append('bl', 'boq_identityfrontenduiserver_20240129.02_p0');
            params.append('app', '0');

            await sleep(500); // to not be suspicious
            const saveConsentRequest = await fetch('https://consent.google.com/save', {
                method: 'POST',
                headers: consentHeaders,
                body: params.toString(),
                redirect: 'manual'
            });

            if (saveConsentRequest.status === 303) {
                // consent was saved, save new cookies and retry the request
                this.#setCookies(saveConsentRequest.headers.get('set-cookie'));
                await sleep(500);
                return this.fetch({}, originalDimensions, true);
            }
        }

        if (response.status !== 200) {
            throw new LensError('Lens returned a non-200 status code', response.status, response.headers, text);
        }

        try {
            const afData = LensCore.getAFData(text);
            return LensCore.parseResult(afData, originalDimensions);
        } catch (e) {
            throw new LensError(`Could not parse response: ${e.stack}`, response.status, response.headers, text);
        }
    }

    async scanByURL(url, dimensions = [0, 0]) {
        const endpoint = new URL(LENS_API_ENDPOINT)

        endpoint.searchParams.set('url', String(url))

        const options = {
            endpoint: String(endpoint),
            method: 'GET',
        }

        return this.fetch(options, dimensions)
    }

    async scanByData(uint8, mime, originalDimensions) {
        if (!SUPPORTED_MIMES.includes(mime)) {
            throw new Error('File type not supported');
        }
        if(!originalDimensions) throw new Error('Original dimensions not set');

        let fileName = `image.${MIME_TO_EXT[mime]}`;

        const dimensions = imageDimensionsFromData(uint8);
        if (!dimensions) {
            throw new Error('Could not determine image dimensions');
        }

        const { width, height } = dimensions;
        // Google Lens does not accept images larger than 1000x1000
        if (width > 1000 || height > 1000) {
            throw new Error('Image dimensions are larger than 1000x1000');
        }

        const file = new File([uint8], fileName, { type: mime });
        const formdata = new FormData();

        formdata.append('encoded_image', file);
        formdata.append('original_width', '' + width);
        formdata.append('original_height', '' + height);
        formdata.append('processed_image_dimensions', `${width},${height}`);

        const options = {
            endpoint: LENS_ENDPOINT,
            method: 'POST',
            body: formdata,
        }

        return this.fetch(options, originalDimensions);
    }

    #generateHeaders() {
        return {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Origin': 'https://lens.google.com',
            'Referer': 'https://lens.google.com/',
            'Sec-Ch-Ua': `"Not A(Brand";v="99", "Google Chrome";v="${this.#config.majorChromeVersion}", "Chromium";v="${this.#config.majorChromeVersion}"`,
            'Sec-Ch-Ua-Arch': '"x86"',
            'Sec-Ch-Ua-Bitness': '"64"',
            'Sec-Ch-Ua-Full-Version': `"${this.#config.chromeVersion}"`,
            'Sec-Ch-Ua-Full-Version-List': `"Not A(Brand";v="99.0.0.0", "Google Chrome";v="${this.#config.majorChromeVersion}", "Chromium";v="${this.#config.majorChromeVersion}"`,
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
            'User-Agent': this.#config.userAgent,
            'X-Client-Data': 'CIW2yQEIorbJAQipncoBCIH+ygEIlaHLAQj1mM0BCIWgzQEI3ezNAQji+s0BCOmFzgEIponOAQj1ic4BCIeLzgEY1d3NARjS/s0BGNiGzgE='
            /*
                X-Client-Data: CIW2yQEIorbJAQipncoBCIH+ygEIlaHLAQj1mM0BCIWgzQEI3ezNAQji+s0BCOmFzgEIponOAQj1ic4BCIeLzgEY1d3NARjS/s0BGNiGzgE=
                Decoded:
                message ClientVariations {
                    // Active client experiment variation IDs.
                    repeated int32 variation_id = [3300101, 3300130, 3313321, 3325697, 3330197, 3361909, 3362821, 3372637, 3374434, 3375849, 3376294, 3376373, 3376519];
                    // Active client experiment variation IDs that trigger server-side behavior.
                    repeated int32 trigger_variation_id = [3370709, 3374930, 3375960];
                }
            */
        };
    }

    #generateCookieHeader(header) {
        if (Object.keys(this.cookies).length > 0) {
            this.cookies = Object.fromEntries(Object.entries(this.cookies).filter(([name, cookie]) => cookie.expires > Date.now()));
            header.cookie = Object.entries(this.cookies)
                .map(([name, cookie]) => `${name}=${cookie.value}`).join('; ');
        }
    }

    #setCookies(combinedCookieHeader) {
        const splitCookieHeaders = setCookie.splitCookiesString(combinedCookieHeader);
        const cookies = setCookie.parse(splitCookieHeaders);

        if (cookies.length > 0) {
            for (const cookie of cookies) {
                this.cookies[cookie.name] = cookie;
                cookie.expires = cookie.expires.getTime();
            }
        }
    }

    #parseCookies() {
        if (this.#config?.headers?.cookie) {
            if (typeof this.#config?.headers?.cookie === 'string') {
                // parse cookies from string
                const cookies = parseCookies(this.#config.headers.cookie);
                for (const cookie in cookies) {
                    this.cookies[cookie] = {
                        name: cookie,
                        value: cookies[cookie],
                        expires: Infinity
                    };
                }
            } else {
                this.cookies = this.#config.headers.cookie;
            }
        }
    }

    static getAFData(text) {
        const callbacks = text.match(/AF_initDataCallback\((\{.*?\})\)/gms);
        const lensCallback = callbacks.find(c => c.includes('DetectedObject'));

        if (!lensCallback) {
            console.log(callbacks);
            throw new Error('Could not find matching AF_initDataCallback');
        }

        const match = lensCallback.match(/AF_initDataCallback\((\{.*?\})\)/ms);

        return eval(`(${match[1]})`);
    }

    static parseResult(afData, imageDimensions) {
        const data = afData.data;
        const fullTextPart = data[3];
        let text_segments = [], text_regions = [];

        try {
            // method 1, get text segments and regions directly
            text_segments = fullTextPart[4][0][0];
            text_regions = data[2][3][0]
                .filter(x => x[11].startsWith("text:"))
                .map(x => x[1]);
        } catch (e) {
            // method 2
            // sometimes the text segments are not directly available
            // try to get them from text parts
            let big_parts = fullTextPart[2][0];
            for(let big_part of big_parts) {
                let parts = big_part[0];
                for(let part of parts) {
                    let text = part[0].reduce((a, b) => {
                        return a + b[0] + (b[3] ?? '');
                    }, '');

                    // region data is different format from method 1
                    // instead of [centerX, centerY, width, height] it's [topLeftY, topLeftX, width, height]
                    // so we need to convert it
                    let region = part[1];
                    let [y, x, width, height] = region;
                    let centerX = x + (width / 2), centerY = y + (height / 2);
                    region = [centerX, centerY, width, height];

                    text_segments.push(text);
                    text_regions.push(region);
                }
            }
        }

        const segments = [];
        for (const i in text_segments) {
            const segment = new Segment(text_segments[i], text_regions[i], imageDimensions);
            segments.push(segment);
        }

        return new LensResult(fullTextPart[3], segments);
    }
}
