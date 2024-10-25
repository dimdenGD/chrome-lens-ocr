import { access, constants, readFile } from 'node:fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import { imageDimensionsFromData } from 'image-dimensions';
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
            throw new TypeError(`scanByFile expects a string, got ${typeof path}`)
        }

        try {
            await access(path, constants.R_OK)
        } catch (error) {
            switch (error.code) {
                case 'EACCES': throw new Error(`Read permission denied: ${path}`)
                case 'ENOENT': throw new Error(`File not found: ${path}`)
                case 'EISDIR': throw new Error(`Expected file, Found directory: ${path}`)
            }
        }

        const file = await readFile(path);

        return this.scanByBuffer(file);
    }

    async scanByBuffer(buffer) {
        const fileType = await fileTypeFromBuffer(buffer);

        if (!fileType) throw new Error('File type not supported');

        let uint8Array = Uint8Array.from(buffer);

        const dimensions = imageDimensionsFromData(uint8Array);
        if (!dimensions) {
            throw new Error('Could not determine image dimensions');
        }

        // Google Lens does not accept images larger than 1000x1000
        if (dimensions.width > 1000 || dimensions.height > 1000) {
            uint8Array = Uint8Array.from(await sharp(buffer)
                .resize(1000, 1000, { fit: 'inside' })
                .withMetadata()
                .jpeg({ quality: 90, progressive: true })
                .toBuffer()
            );
        }

        return this.scanByData(uint8Array, fileType.mime, [dimensions.width, dimensions.height]);
    }
}
