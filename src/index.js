import { access, constants, readFile } from 'node:fs/promises';
import { fileTypeFromBuffer } from 'file-type';
// imageDimensionsFromData не нужен здесь, так как он используется в core.js и для ресайза в sharp
import sharp from 'sharp';
import { fetch } from 'undici'; // fetch для конструктора LensCore

import LensCore, { LensResult, LensError, Segment, BoundingBox } from './core.js';

export { LensResult, LensError, Segment, BoundingBox };

export default class Lens extends LensCore {
    constructor(config = {}, _fetch) {
        if (typeof config !== 'object') {
            console.warn('Lens constructor expects an object, got', typeof config);
            config = {};
        }

        let fetchFn = _fetch;
        if (!fetchFn) {
            fetchFn = fetch; // Используем undici.fetch по умолчанию
        }
        super(config, fetchFn);
    }

    async scanByFile(path) {
        if (typeof path !== 'string') {
            throw new TypeError(`scanByFile expects a string, got ${typeof path}`);
        }

        try {
            await access(path, constants.R_OK);
        } catch (error) {
            switch (error.code) {
                case 'EACCES': throw new Error(`Read permission denied: ${path}`);
                case 'ENOENT': throw new Error(`File not found: ${path}`);
                case 'EISDIR': throw new Error(`Expected file, Found directory: ${path}`);
                default: throw error; // Перебрасываем другие ошибки
            }
        }

        const fileBuffer = await readFile(path);
        return this.scanByBuffer(fileBuffer);
    }

    async scanByBuffer(buffer) {
        const fileType = await fileTypeFromBuffer(buffer);

        if (!fileType) {
            // Если тип не определен, но это буфер, можно попытаться его обработать как есть
            // или выбросить ошибку. Python скрипт просто передавал байты.
            // Однако, для sharp лучше знать тип или он попытается угадать.
            // Для proto API может быть важно, что это изображение.
             console.warn('Could not determine file type from buffer. Attempting to process anyway.');
        }
        
        // Для сохранения оригинальных размеров для BoundingBox
        let originalWidth, originalHeight;
        try {
            const metadata = await sharp(buffer).metadata();
            originalWidth = metadata.width;
            originalHeight = metadata.height;
        } catch (e) {
            throw new Error('Could not read image metadata using sharp.');
        }

        if (!originalWidth || !originalHeight) {
             throw new Error('Could not determine original image dimensions.');
        }

        let imageToProcessBuffer = buffer;
        let finalMime = fileType?.mime || 'image/png'; // По умолчанию PNG, если тип не определен

        // Логика изменения размера и формата
        // Python скрипт ресайзил до ~3MP и конвертировал в PNG.
        // Старый chrome-lens-ocr ресайзил до 1000x1000 и в JPEG.
        // Выберем PNG и лимит, например, 1200x1200 (чуть больше 1000, но не слишком много)
        const MAX_DIMENSION = 1200; // Можно сделать настраиваемым
        if (originalWidth > MAX_DIMENSION || originalHeight > MAX_DIMENSION) {
            imageToProcessBuffer = await sharp(buffer)
                .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
                .png() // Конвертируем в PNG для Protobuf API
                .toBuffer();
            finalMime = 'image/png';
        } else if (fileType && fileType.mime !== 'image/png') {
            // Если изображение не слишком большое, но не PNG, все равно конвертируем в PNG
            imageToProcessBuffer = await sharp(buffer)
                .png()
                .toBuffer();
            finalMime = 'image/png';
        }
        // Если это уже PNG и подходящего размера, imageToProcessBuffer останется исходным buffer.

        const uint8Array = Uint8Array.from(imageToProcessBuffer);

        // Передаем originalWidth, originalHeight для корректного расчета BoundingBox
        return super.scanByData(uint8Array, finalMime, [originalWidth, originalHeight]);
    }
}