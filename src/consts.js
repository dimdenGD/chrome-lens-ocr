// ЗАМЕНИТЬ или ДОБАВИТЬ ЭТИ КОНСТАНТЫ
export const LENS_PROTO_ENDPOINT = 'https://lensfrontend-pa.googleapis.com/v1/crupload';
export const LENS_API_KEY = 'AIzaSyDr2UxVnv_U85AbhhY8XSHSIavUW0DC-sY'; // ВАЖНО: Ключ из Python скрипта

// Старые константы (могут остаться, если есть код, который их использует, или удалить)
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

// MIME_TO_EXT и EXT_TO_MIME остаются как есть
export const MIME_TO_EXT = {
    'image/x-icon': 'ico',
    'image/bmp': 'bmp',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/tiff': 'tiff',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/gif': 'gif' // GIF не в SUPPORTED_MIMES, но тут есть
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