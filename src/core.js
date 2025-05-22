import { imageDimensionsFromData } from 'image-dimensions';
import setCookie from 'set-cookie-parser';
import { LENS_PROTO_ENDPOINT, LENS_API_KEY, MIME_TO_EXT, SUPPORTED_MIMES } from './consts.js';
import { parseCookies, sleep } from './utils.js';

// --- Начало импорта Protobuf классов ---
// Убедись, что пути и имена файлов соответствуют твоей структуре в src/utils/proto_generated/
// Это примерный список на основе lens_betterproto.txt и типичных имен файлов.
// Тебе нужно будет проверить и скорректировать их.

// Общие
const { LensOverlayServerRequest, LensOverlayObjectsRequest, LensOverlayRequestContext, LensOverlayServerResponse, LensOverlayServerError, LensOverlayServerErrorErrorType } = require('./utils/proto_generated/lens_overlay_server_pb.js');
const { LensOverlayClientContext, LocaleContext, ClientLoggingData } = require('./utils/proto_generated/lens_overlay_client_context_pb.js');
const { Platform, Surface } = require('./utils/proto_generated/lens_overlay_client_platform_pb.js'); // Enums
const { ImageData, ImagePayload, ImageMetadata } = require('./utils/proto_generated/lens_overlay_image_data_pb.js');
const { LensOverlayRequestId } = require('./utils/proto_generated/lens_overlay_request_id_pb.js');
const { AppliedFilter, AppliedFilters, LensOverlayFilterType } = require('./utils/proto_generated/lens_overlay_filters_pb.js');
const { Text, TextLayout, TextLayoutParagraph, TextLayoutLine, TextLayoutWord, WritingDirection, Alignment } = require('./utils/proto_generated/lens_overlay_text_pb.js');
const { Geometry, CenterRotatedBox, CoordinateType } = require('./utils/proto_generated/lens_overlay_geometry_pb.js');
// --- Конец импорта Protobuf классов ---


// Существующие классы BoundingBox, LensError, Segment, LensResult ОСТАЮТСЯ КАК ЕСТЬ (или с минимальными изменениями)

export class BoundingBox {
    #imageDimensions;
    constructor(box, imageDimensions) { // box это [centerPerX, centerPerY, perWidth, perHeight]
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
        this.boundingBox = boundingBox; // Экземпляр BoundingBox
    }
}

export class LensResult {
    constructor(language, segments) {
        this.language = language;
        this.segments = segments; // Массив экземпляров Segment
    }
}


export default class LensCore {
    #config = {};
    cookies = {}; // Куки могут все еще быть полезны для других эндпоинтов или если этот API их тоже использует
    _fetch = globalThis.fetch && globalThis.fetch.bind(globalThis);

    constructor(config = {}, fetch) {
        if (typeof config !== 'object') {
            throw new TypeError('Lens constructor expects an object');
        }

        if (fetch) this._fetch = fetch;

        // Конфигурация по умолчанию, включая userAgent, viewport
        const chromeVersion = config?.chromeVersion ?? '124.0.6367.60'; // Версия из старого конфига
        const majorChromeVersion = config?.majorChromeVersion ?? chromeVersion.split('.')[0];


        this.#config = {
            chromeVersion,
            majorChromeVersion,
            userAgent: config?.userAgent ?? `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorChromeVersion}.0.0.0 Safari/537.36`,
            endpoint: LENS_PROTO_ENDPOINT, // Новый эндпоинт по умолчанию
            viewport: config?.viewport ?? [1920, 1080], // Вьюпорт из Python скрипта не было, но может быть полезен
            headers: {}, // Пользовательские заголовки
            fetchOptions: {}, // Опции для fetch (прокси и т.д.)
            targetLanguage: config?.targetLanguage ?? 'en', // Язык по умолчанию
            ...config
        };

        // Приведение заголовков к нижнему регистру
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
        this.#parseCookies(); // Парсинг кук из опций, если есть
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
        // requestId.setUuid(Date.now()); // Python использовал random.randint(0, 2**64 - 1)
        // JavaScript не имеет простого u64, но для уникальности в рамках сессии хватит
        // Преобразуем Date.now() в строку, чтобы избежать проблем с типами, если поле строковое, или оставим как число, если числовое
        // В proto оно uint64. google-protobuf для JS может обрабатывать числа или строки для 64-битных целых.
        // Используем строку, чтобы быть уверенным.
        requestId.setUuid(String(Date.now()) + String(Math.floor(Math.random() * 1000000)));
        requestId.setSequenceId(1);
        requestId.setImageSequenceId(1);
        // requestId.setAnalyticsId(...); // random.randbytes(16) - можно сгенерировать Uint8Array(16) со случайными значениями

        const localeContext = new LocaleContext();
        localeContext.setLanguage(targetLanguage);
        localeContext.setRegion(this.#config.region || 'US'); // Можно сделать настраиваемым
        localeContext.setTimeZone(this.#config.timeZone || 'America/New_York'); // Можно сделать настраиваемым

        const appliedFilter = new AppliedFilter();
        appliedFilter.setFilterType(LensOverlayFilterType.AUTO_FILTER);
        const clientFilters = new AppliedFilters();
        clientFilters.addFilter(appliedFilter);

        const clientContext = new LensOverlayClientContext();
        clientContext.setPlatform(Platform.WEB);
        clientContext.setSurface(Surface.CHROMIUM);
        clientContext.setLocaleContext(localeContext);
        clientContext.setClientFilters(clientFilters);
        // clientContext.setAppId("chrome-lens-ocr"); // Можно добавить

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

        return serverRequest.serializeBinary(); // Возвращаем Uint8Array
    }

    #parseLensProtoResponse(serverResponseProto, originalImageDimensions) {
        if (serverResponseProto.hasError()) {
            const errorProto = serverResponseProto.getError();
            const errorTypeName = Object.keys(LensOverlayServerErrorErrorType).find(key => LensOverlayServerErrorErrorType[key] === errorProto.getErrorType());
            console.warn(`Lens server returned error: Type=${errorProto.getErrorType()} (${errorTypeName})`);
            if (errorProto.getErrorType() !== LensOverlayServerErrorErrorType.UNKNOWN_TYPE) { // UNKNOWN_TYPE = 0, не критическая
                 return new LensResult('', []); // Критическая ошибка
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
                    } else if (i < wordsList.length -1) { // Добавляем пробел если нет сепаратора, кроме последнего слова
                        lineTextContent += ' ';
                    }
                }
                lineTextContent = lineTextContent.replace(/\s+/g, ' ').trim();


                if (lineTextContent) {
                    let boundingBox = null;
                    // Пытаемся получить геометрию для строки
                    if (line.hasGeometry() && line.getGeometry().hasBoundingBox()) {
                        const protoGeoBox = line.getGeometry().getBoundingBox(); // CenterRotatedBox
                        // Предполагаем, что getCoordinateType() == CoordinateType.NORMALIZED
                        // и rotation_z == 0 для простого BoundingBox
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
                    // Если у строки нет геометрии, можно попробовать взять у параграфа или оставить null
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
                    // Если boundingBox все еще null, создаем пустой или дефолтный
                    if (!boundingBox) {
                        boundingBox = new BoundingBox([0.5, 0.5, 1, 1], originalImageDimensions); // Или [0,0,0,0]
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
            'X-Goog-Api-Key': LENS_API_KEY, // Используем импортированный ключ
            'User-Agent': this.#config.userAgent,
            'Accept': '*/*', // Python-скрипт не указывал Accept явно для proto запроса, но это безопасно
            'Accept-Encoding': 'gzip, deflate, br', // Стандартные заголовки
            'Accept-Language': this.#config.targetLanguage ? `${this.#config.targetLanguage},en;q=0.9` : 'en-US,en;q=0.9',
            // 'Origin': 'https://lens.google.com', // Не уверен, нужен ли Origin для этого API
            // 'Referer': 'https://lens.google.com/', // Аналогично
            ...this.#config.headers, // Пользовательские заголовки из конфига
        };
        this.#generateCookieHeader(headers); // Добавляем куки, если они есть

        const response = await this._fetch(LENS_PROTO_ENDPOINT, {
            method: 'POST',
            headers,
            body: serializedRequestUint8Array,
            redirect: 'follow', // Для API обычно 'follow'
            ...this.#config.fetchOptions
        });

        this.#setCookies(response.headers.get('set-cookie'));

        if (!response.ok) {
            const errorBodyText = await response.text().catch(() => 'Could not read error body');
            throw new LensError(
                `Lens Protobuf API request failed with status ${response.status}`,
                String(response.status), // code должен быть строкой
                response.headers,
                errorBodyText
            );
        }

        const responseArrayBuffer = await response.arrayBuffer();
        const responseUint8Array = new Uint8Array(responseArrayBuffer);
        return LensOverlayServerResponse.deserializeBinary(responseUint8Array);
    }

    async scanByURL(url) {
        // Загрузка изображения по URL
        const imageResponse = await this._fetch(url);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image from URL: ${url}, status: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const uint8ImgArray = new Uint8Array(imageBuffer);

        // Определение MIME-типа, если возможно (может быть неточным по URL)
        let mime = 'image/jpeg'; // По умолчанию
        const ext = url.split('.').pop().toLowerCase();
        if (ext && EXT_TO_MIME[ext]) {
            mime = EXT_TO_MIME[ext];
        }
        // Для более точного определения MIME можно использовать file-type, как в Lens классе, если передавать буфер

        // Определение размеров (важно для Protobuf запроса)
        // Если sharp доступен здесь или мы передаем управление в scanByData, который ожидает уже обработанный Uint8Array
        // Для простоты, будем полагать, что scanByData в LensCore ожидает уже готовый Uint8Array и его размеры
        // Поэтому, эта реализация scanByURL в LensCore может быть упрощенной или делегировать в Lens (index.js)
        // Пока что сделаем прямое сканирование, но без ресайза тут. Ресайз в `Lens` классе.
        const dimensions = imageDimensionsFromData(uint8ImgArray);
        if (!dimensions) {
            throw new Error('Could not determine image dimensions from URL.');
        }
        // Google Lens (старый API) не принимал > 1000x1000. Python скрипт для proto ресайзил до 3Мп.
        // Если изображение слишком большое, здесь может быть ошибка на стороне сервера.
        // Ресайз лучше делать в классе Lens перед вызовом scanByData.

        return this.scanByData(uint8ImgArray, mime, [dimensions.width, dimensions.height]);
    }

    async scanByData(uint8Array, mime, originalDimensions) {
        // mime здесь может быть важен, если API ожидает определенный тип, но proto обычно просто берет байты.
        // Python скрипт конвертировал все в PNG перед отправкой.
        // Если uint8Array уже PNG, то отлично. Если нет, и API этого требует, нужна конвертация.
        // Предположим, что uint8Array уже в нужном формате (например, PNG < 3Мп или JPEG < 1000x1000, как решит класс Lens)
        if (!SUPPORTED_MIMES.includes(mime) && mime !== 'image/gif') { // GIF может быть сконвертирован в PNG/JPEG через sharp
            console.warn(`MIME type ${mime} might not be directly supported by the proto API, conversion recommended.`);
        }


        const actualDimensions = imageDimensionsFromData(uint8Array);
         if (!actualDimensions) {
            throw new Error('Could not determine actual image dimensions for proto request.');
        }

        const serializedRequest = this.#createLensProtoRequest(uint8Array, actualDimensions.width, actualDimensions.height);
        const serverResponse = await this._sendProtoRequest(serializedRequest);

        // Используем originalDimensions для расчета пиксельных координат в BoundingBox
        return this.#parseLensProtoResponse(serverResponse, originalDimensions || [actualDimensions.width, actualDimensions.height]);
    }

    // Вспомогательные методы для cookie (остаются как есть)
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
                    if (cookie.name && cookie.value) { // Убедимся, что есть имя и значение
                        this.cookies[cookie.name] = {
                            ...cookie,
                            // Преобразуем expires в timestamp, если это Date объект
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
                const parsed = parseCookies(cookieHeader); // parseCookies из utils.js
                for (const name in parsed) {
                    this.cookies[name] = {
                        name,
                        value: parsed[name],
                        expires: Infinity // По умолчанию, если не указано в строке
                    };
                }
            } else if (typeof cookieHeader === 'object') { // Если куки переданы как объект { name: { value, expires_timestamp }}
                 for (const name in cookieHeader) {
                    if (typeof cookieHeader[name] === 'object' && cookieHeader[name].value !== undefined) {
                        this.cookies[name] = {
                            name,
                            value: cookieHeader[name].value,
                            expires: cookieHeader[name].expires || Infinity, // expires должно быть timestamp
                            ...cookieHeader[name] // Копируем остальные свойства (path, domain, etc.)
                        };
                    } else if (typeof cookieHeader[name] === 'string') { // Для обратной совместимости, если просто { name: value_string }
                         this.cookies[name] = { name, value: cookieHeader[name], expires: Infinity};
                    }
                }
            }
        }
    }
}