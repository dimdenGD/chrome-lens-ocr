import { imageDimensionsFromData } from 'image-dimensions';
import setCookie from 'set-cookie-parser';
import { LENS_PROTO_ENDPOINT, LENS_API_KEY, MIME_TO_EXT, EXT_TO_MIME, SUPPORTED_MIMES } from './consts.js';

import { parseCookies, sleep } from './utils.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { LensOverlayServerRequest, LensOverlayObjectsRequest, LensOverlayRequestContext, LensOverlayServerResponse, LensOverlayServerError, LensOverlayServerErrorErrorType } = require('./utils/proto_generated/lens_overlay_server_pb.cjs');
const { LensOverlayClientContext, LocaleContext, ClientLoggingData } = require('./utils/proto_generated/lens_overlay_client_context_pb.cjs');
const { Platform, Surface } = require('./utils/proto_generated/lens_overlay_client_platform_pb.cjs');
const { ImageData, ImagePayload, ImageMetadata } = require('./utils/proto_generated/lens_overlay_image_data_pb.cjs');
const { LensOverlayRequestId } = require('./utils/proto_generated/lens_overlay_request_id_pb.cjs');
const { AppliedFilter, AppliedFilters, LensOverlayFilterType } = require('./utils/proto_generated/lens_overlay_filters_pb.cjs');
const { Text, TextLayout, TextLayoutParagraph, TextLayoutLine, TextLayoutWord, WritingDirection, Alignment } = require('./utils/proto_generated/lens_overlay_text_pb.cjs');
const { Geometry, CenterRotatedBox, CoordinateType } = require('./utils/proto_generated/lens_overlay_geometry_pb.cjs');


export class BoundingBox {
    #imageDimensions;
    constructor(box, imageDimensions) {
        if (!box || box.length !== 4) throw new Error('Bounding box array [centerPerX, centerPerY, perWidth, perHeight] not set or invalid');
        if (!imageDimensions || imageDimensions.length !== 2) throw new Error('Image dimensions [width, height] not set or invalid');

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
    constructor(text, boundingBox) {
        this.text = text;
        this.boundingBox = boundingBox;
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
        const majorChromeVersion = config?.majorChromeVersion ?? chromeVersion.split('.')[0];

        this.#config = {
            chromeVersion,
            majorChromeVersion,
            userAgent: config?.userAgent ?? `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorChromeVersion}.0.0.0 Safari/537.36`,
            endpoint: LENS_PROTO_ENDPOINT,
            viewport: config?.viewport ?? [1920, 1080],
            headers: {},
            fetchOptions: {},
            targetLanguage: config?.targetLanguage ?? 'en',
            ...config
        };

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

    #createLensProtoRequest(imageBytesUint8Array, width, height) {
        const targetLanguage = this.#config.targetLanguage;

        const requestId = new LensOverlayRequestId();
        requestId.setUuid(String(Date.now()) + String(Math.floor(Math.random() * 1000000)));
        requestId.setSequenceId(1);
        requestId.setImageSequenceId(1);

        const localeContext = new LocaleContext();
        localeContext.setLanguage(targetLanguage);
        localeContext.setRegion(this.#config.region || 'US');
        localeContext.setTimeZone(this.#config.timeZone || 'America/New_York');

        const appliedFilter = new AppliedFilter();
        appliedFilter.setFilterType(LensOverlayFilterType.AUTO_FILTER);
        const clientFilters = new AppliedFilters();
        clientFilters.addFilter(appliedFilter);

        const clientContext = new LensOverlayClientContext();
        clientContext.setPlatform(Platform.WEB);
        clientContext.setSurface(Surface.CHROMIUM);
        clientContext.setLocaleContext(localeContext);
        clientContext.setClientFilters(clientFilters);

        const requestContext = new LensOverlayRequestContext();
        requestContext.setRequestId(requestId);
        requestContext.setClientContext(clientContext);

        const imageMetadata = new ImageMetadata();
        imageMetadata.setWidth(width);
        imageMetadata.setHeight(height);

        const imagePayload = new ImagePayload();
        imagePayload.setImageBytes(imageBytesUint8Array);

        const imageData = new ImageData();
        imageData.setPayload(imagePayload);
        imageData.setImageMetadata(imageMetadata);

        const objectsRequest = new LensOverlayObjectsRequest();
        objectsRequest.setRequestContext(requestContext);
        objectsRequest.setImageData(imageData);

        const serverRequest = new LensOverlayServerRequest();
        serverRequest.setObjectsRequest(objectsRequest);

        return serverRequest.serializeBinary();
    }

    #parseLensProtoResponse(serverResponseProto, originalImageDimensions) {
        if (serverResponseProto.hasError()) {
            const errorProto = serverResponseProto.getError();
            const errorTypeName = Object.keys(LensOverlayServerErrorErrorType).find(key => LensOverlayServerErrorErrorType[key] === errorProto.getErrorType());
            console.warn(`Lens server returned error: Type=${errorProto.getErrorType()} (${errorTypeName})`);
            if (errorProto.getErrorType() !== LensOverlayServerErrorErrorType.UNKNOWN_TYPE) {
                 return new LensResult('', []);
            }
        }

        if (!serverResponseProto.hasObjectsResponse()) {
            return new LensResult('', []);
        }
        const objectsResponse = serverResponseProto.getObjectsResponse();

        if (!objectsResponse.hasText() || !objectsResponse.getText().hasTextLayout()) {
            return new LensResult('', []);
        }

        const textProto = objectsResponse.getText();
        const textLayout = textProto.getTextLayout();
        const detectedLanguage = textProto.getContentLanguage() || (textLayout.getParagraphsList()[0]?.getContentLanguage()) || '';

        const segments = [];

        for (const paragraph of textLayout.getParagraphsList()) {
            for (const line of paragraph.getLinesList()) {
                let lineTextContent = '';
                const wordsList = line.getWordsList();
                for (let i = 0; i < wordsList.length; i++) {
                    const word = wordsList[i];
                    lineTextContent += word.getPlainText();
                    if (word.hasTextSeparator()) {
                         lineTextContent += word.getTextSeparator();
                    } else if (i < wordsList.length -1) {
                        lineTextContent += ' ';
                    }
                }
                lineTextContent = lineTextContent.replace(/\s+/g, ' ').trim();

                if (lineTextContent) {
                    let boundingBox = null;
                    if (line.hasGeometry() && line.getGeometry().hasBoundingBox()) {
                        const protoGeoBox = line.getGeometry().getBoundingBox();
                        if (protoGeoBox.getCoordinateType() === CoordinateType.NORMALIZED) {
                             const boxData = [
                                protoGeoBox.getCenterX(),
                                protoGeoBox.getCenterY(),
                                protoGeoBox.getWidth(),
                                protoGeoBox.getHeight()
                            ];
                            boundingBox = new BoundingBox(boxData, originalImageDimensions);
                        }
                    }
                    if (!boundingBox && paragraph.hasGeometry() && paragraph.getGeometry().hasBoundingBox()) {
                         const protoGeoBox = paragraph.getGeometry().getBoundingBox();
                         if (protoGeoBox.getCoordinateType() === CoordinateType.NORMALIZED) {
                            const boxData = [
                                protoGeoBox.getCenterX(),
                                protoGeoBox.getCenterY(),
                                protoGeoBox.getWidth(),
                                protoGeoBox.getHeight()
                            ];
                            boundingBox = new BoundingBox(boxData, originalImageDimensions);
                        }
                    }
                    if (!boundingBox) {
                        boundingBox = new BoundingBox([0.5, 0.5, 1, 1], originalImageDimensions);
                    }
                    segments.push(new Segment(lineTextContent, boundingBox));
                }
            }
        }
        return new LensResult(detectedLanguage, segments);
    }

    async _sendProtoRequest(serializedRequestUint8Array) {
        const headers = {
            'Content-Type': 'application/x-protobuf',
            'X-Goog-Api-Key': LENS_API_KEY,
            'User-Agent': this.#config.userAgent,
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': this.#config.targetLanguage ? `${this.#config.targetLanguage},en;q=0.9` : 'en-US,en;q=0.9',
            ...this.#config.headers,
        };
        this.#generateCookieHeader(headers);

        const response = await this._fetch(LENS_PROTO_ENDPOINT, {
            method: 'POST',
            headers,
            body: serializedRequestUint8Array,
            redirect: 'follow',
            ...this.#config.fetchOptions
        });

        this.#setCookies(response.headers.get('set-cookie'));

        if (!response.ok) {
            const errorBodyText = await response.text().catch(() => 'Could not read error body');
            throw new LensError(
                `Lens Protobuf API request failed with status ${response.status}`,
                String(response.status),
                response.headers,
                errorBodyText
            );
        }

        const responseArrayBuffer = await response.arrayBuffer();
        const responseUint8Array = new Uint8Array(responseArrayBuffer);
        return LensOverlayServerResponse.deserializeBinary(responseUint8Array);
    }

    async scanByURL(url) {
        const imageResponse = await this._fetch(url);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image from URL: ${url}, status: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const uint8ImgArray = new Uint8Array(imageBuffer);

        let mime = 'image/jpeg';
        const ext = url.split('.').pop().toLowerCase();
        if (ext && EXT_TO_MIME[ext]) {
            mime = EXT_TO_MIME[ext];
        }
        
        const dimensions = imageDimensionsFromData(uint8ImgArray);
        if (!dimensions) {
            throw new Error('Could not determine image dimensions from URL.');
        }
        
        return this.scanByData(uint8ImgArray, mime, [dimensions.width, dimensions.height]);
    }

    async scanByData(uint8Array, mime, originalDimensions) {
        if (!SUPPORTED_MIMES.includes(mime) && mime !== 'image/gif') {
            console.warn(`MIME type ${mime} might not be directly supported by the proto API, conversion recommended.`);
        }

        const actualDimensions = imageDimensionsFromData(uint8Array);
         if (!actualDimensions) {
            throw new Error('Could not determine actual image dimensions for proto request.');
        }

        const serializedRequest = this.#createLensProtoRequest(uint8Array, actualDimensions.width, actualDimensions.height);
        const serverResponse = await this._sendProtoRequest(serializedRequest);
        
        return this.#parseLensProtoResponse(serverResponse, originalDimensions || [actualDimensions.width, actualDimensions.height]);
    }

    #generateCookieHeader(header) {
        if (Object.keys(this.cookies).length > 0) {
            const validCookies = Object.entries(this.cookies).filter(([name, cookie]) => !cookie.expires || cookie.expires > Date.now());
            this.cookies = Object.fromEntries(validCookies);
            if (validCookies.length > 0) {
                 header.cookie = validCookies.map(([name, cookie]) => `${name}=${cookie.value}`).join('; ');
            }
        }
    }

    #setCookies(combinedCookieHeader) {
        if (!combinedCookieHeader) return;
        try {
            const splitCookieHeaders = setCookie.splitCookiesString(combinedCookieHeader);
            const cookies = setCookie.parse(splitCookieHeaders, { decodeValues: false });

            if (cookies.length > 0) {
                for (const cookie of cookies) {
                    if (cookie.name && cookie.value) {
                        this.cookies[cookie.name] = {
                            ...cookie,
                            expires: cookie.expires ? new Date(cookie.expires).getTime() : Infinity,
                        };
                    }
                }
            }
        } catch (error) {
            console.error("Failed to parse or set cookies:", error);
        }
    }

    #parseCookies() {
        const cookieHeader = this.#config?.headers?.cookie;
        if (cookieHeader) {
            if (typeof cookieHeader === 'string') {
                const parsed = parseCookies(cookieHeader);
                for (const name in parsed) {
                    this.cookies[name] = {
                        name,
                        value: parsed[name],
                        expires: Infinity
                    };
                }
            } else if (typeof cookieHeader === 'object') {
                 for (const name in cookieHeader) {
                    if (typeof cookieHeader[name] === 'object' && cookieHeader[name].value !== undefined) {
                        this.cookies[name] = {
                            name,
                            value: cookieHeader[name].value,
                            expires: cookieHeader[name].expires || Infinity,
                            ...cookieHeader[name]
                        };
                    } else if (typeof cookieHeader[name] === 'string') {
                         this.cookies[name] = { name, value: cookieHeader[name], expires: Infinity};
                    }
                }
            }
        }
    }
}