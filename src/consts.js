export const LENS_ENDPOINT = 'https://lens.google.com/v3/upload';
export const LENS_API_ENDPOINT = 'https://lens.google.com/uploadbyurl';

// ico, bmp, jfif, pjpeg, jpeg, pjp, jpg, png, tif, tiff, webp, heic
export const SUPPORTED_MIMES = [
    'image/x-icon',
    'image/bmp',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/webp',
    'image/heic'
];

export const MIME_TO_EXT = {
    'image/x-icon': 'ico',
    'image/bmp': 'bmp',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/tiff': 'tiff',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/gif': 'gif'
};

export const EXT_TO_MIME = {
    'ico': 'image/x-icon',
    'bmp': 'image/bmp',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'tiff': 'image/tiff',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'gif': 'image/gif'
};

