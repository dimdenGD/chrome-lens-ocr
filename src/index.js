import { readFile } from 'node:fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import { imageDimensionsFromData } from 'image-dimensions';
import sharp from 'sharp';
import { fetch } from 'undici';

import LensCore, { LensResult, LensError, Segment, BoundingBox } from './core.js';

export { LensResult, LensError, Segment, BoundingBox };

export default class Lens extends LensCore {
    constructor(config = {}) {
        if (typeof config !== 'object') {
            console.warn('Lens constructor expects an object, got', typeof config);
            config = {};
        }
        super(config, fetch);
    }

    async scanByFile(path) {
        const file = await readFile(path);

        return this.scanByBuffer(file);
    }

    async scanByBuffer(buffer) {
        const fileType = await fileTypeFromBuffer(buffer);

        if (!fileType) throw new Error('File type not supported');

        const uint8Array = Uint8Array.from(buffer);

        const dimensions = imageDimensionsFromData(uint8Array);
        if (!dimensions) {
            throw new Error('Could not determine image dimensions');
        }

        // Google Lens does not accept images larger than 1000x1000
        if (dimensions.width > 1000 || dimensions.height > 1000) {
            buffer = await sharp(buffer)
                .resize(1000, 1000, { fit: 'inside' })
                .withMetadata()
                .jpeg({ quality: 90, progressive: true })
                .toBuffer();
        }

        return this.scanByData(uint8Array, fileType.mime, [dimensions.width, dimensions.height]);
    }

    async scanByURL(url) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();

        return this.scanByBuffer(Buffer.from(buffer));
    }
}
