import { readFile } from 'node:fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import { imageDimensionsFromData } from 'image-dimensions';
import sharp from 'sharp';
import { fetch } from 'undici';

import LensCore from './core.js';

export default class Lens extends LensCore {
    constructor (config = {}) {
        if (typeof config !== 'object') {
            console.warn('Lens constructor expects an object, got', typeof config);
            config = {};
        }
        super(config, fetch);
    }

    async scanByFile (path) {
        const file = await readFile(path);

        return this.scanByBuffer(file, path.split('/').pop());
    }

    async scanByBuffer (buffer, fileName) {
        const fileType = await fileTypeFromBuffer(buffer);

        if (!fileType) throw new Error('File type not supported');

        const dimensions = imageDimensionsFromData(Uint8Array.from(buffer));
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

            const newDimensions = imageDimensionsFromData(Uint8Array.from(buffer));
            if (!newDimensions) {
                throw new Error('Could not determine new image dimensions');
            }

            dimensions.width = newDimensions.width;
            dimensions.height = newDimensions.height;
        }

        return this.scanByData(buffer, fileName, fileType.mime);
    }

    async scanByURL (url) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();

        return this.scanByBuffer(Buffer.from(buffer), url.split('/').pop());
    }
}
