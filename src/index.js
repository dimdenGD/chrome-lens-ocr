import { access, constants, readFile } from 'node:fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { fetch } from 'undici';

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
            fetchFn = fetch;
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
                default: throw error;
            }
        }

        const fileBuffer = await readFile(path);
        return this.scanByBuffer(fileBuffer);
    }

    async scanByBuffer(buffer) {
        const fileType = await fileTypeFromBuffer(buffer);

        if (!fileType) {
             console.warn('Could not determine file type from buffer. Attempting to process anyway.');
        }
        
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
        let finalMime = fileType?.mime || 'image/png';

        const MAX_DIMENSION = 1200;
        if (originalWidth > MAX_DIMENSION || originalHeight > MAX_DIMENSION) {
            imageToProcessBuffer = await sharp(buffer)
                .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
                .png()
                .toBuffer();
            finalMime = 'image/png';
        } else if (fileType && fileType.mime !== 'image/png') {
            imageToProcessBuffer = await sharp(buffer)
                .png()
                .toBuffer();
            finalMime = 'image/png';
        }
        
        const uint8Array = Uint8Array.from(imageToProcessBuffer);
        
        return super.scanByData(uint8Array, finalMime, [originalWidth, originalHeight]);
    }
}