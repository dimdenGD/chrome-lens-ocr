export const LENS_ENDPOINT = 'https://lens.google.com/v3/upload'
export const LENS_API_ENDPOINT = 'https://lens.google.com/uploadbyurl'
export const SUPPORTED_MIMES: [
  'image/x-icon',
  'image/bmp',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
  'image/heic',
]

export const MIME_TO_EXT: {
  'image/x-icon': 'ico',
  'image/bmp': 'bmp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/tiff': 'tiff',
  'image/webp': 'webp',
  'image/heic': 'heic'
};

export type LensOptions = {
  chromeVersion: string
  majorChromeVersion: string
  userAgent: string
  endpoint: string
  viewport: [number, number]
  headers: Record<string, string>
  fetchOptions: RequestInit
}

export class BoundingBox {
  centerPerX: number
  centerPerY: number
  perWidth: number
  perHeight: number
  pixelCoords: {
    x: number
    y: number
    width: number
    height: number
  }
}

export class Segment {
  text: string
  boundingBox: BoundingBox
}

export class LensResult {
  language: string
  segments: Segment[]
}

export class LensError extends Error {
  name: 'LensError'
  message: string
  code: string
  headers: Record<string, string>
  body: string
}

export class LensCore {
  cookies: NavigatorCookies

  constructor(options?: Partial<LensOptions>, _fetchFunction?: typeof fetch)
  updateOptions(options: Partial<LensOptions>): void

  scanByURL(url: string | URL, dimensions?: [number, number]): Promise<LensResult>
  scanByData(
    data: Uint8Array,
    mime: typeof SUPPORTED_MIMES,
    originalDimensions: [number, number]
  ): Promise<LensResult>

  static getAFData(text: string): object
  static parseResult(
    afData: object,
    imageDimensions: [number, number]
  ): LensResult
}

export default class Lens extends LensCore {
  constructor(options?: Partial<LensOptions>, _fetchFunction?: typeof fetch)

  scanByFile(path: string): Promise<LensResult>
  scanByBuffer(buffer: Buffer): Promise<LensResult>
}
