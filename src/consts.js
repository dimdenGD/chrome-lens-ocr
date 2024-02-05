export const LENS_ENDPOINT = 'https://lens.google.com/v3/upload'

// ico, bmp, jfif, pjpeg, jpeg, pjp, jpg, png, tif, tiff, webp, heic
export const SUPPORTED_MIMES = [
    'image/x-icon',
    'image/bmp',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/webp',
    'image/heic'
]

export const MIME_TO_EXT = {
    'image/x-icon': 'ico',
    'image/bmp': 'bmp',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/tiff': 'tiff',
    'image/webp': 'webp',
    'image/heic': 'heic'
}
