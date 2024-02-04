# Chrome Lens OCR
Library to use Google Lens OCR for free, via API used in Chromium. This doesn't require running a headless browser, and is much faster than using Puppeteer or similar.
It's set up to work without any options, there's no need to be authorized.

## Installation
```bash
npm i chrome-lens-ocr
```

## Usage
```javascript
import Lens from 'chrome-lens-ocr';

const lens = new Lens(options);

lens.scanByFile('shrimple.png').then(console.log).catch(console.error);
lens.scanByURL('https://lune.dimden.dev/7949f833fa42.png').then(console.log).catch(console.error); // this will fetch the image and then scan it
lens.scanByBuffer(Buffer.from('...')).then(console.log).catch(console.error);
```
All methods above return `{ language: String, text_segments: Array<String> }` object. Language is 2-letter ISO code, text_segments is an array of strings, each representing a line of text.

## Methods
#### `scanByFile(path: String): Promise<{ language: String, text_segments: Array<String> }>`
Scans an image from a file.

#### `scanByURL(url: String): Promise<{ language: String, text_segments: Array<String> }>`
Downloads an image from a URL and then scans it.

#### `scanByBuffer(buffer: Buffer, file_name: String): Promise<{ language: String, text_segments: Array<String> }>`
Scans an image from a buffer. `file_name` is optional, but it's recommended to provide it.

#### `updateOptions(options: Object): void`
Updates the options for the instance.

#### `fetch(formdata: FormData): Promise<{ language: String, text_segments: Array<String> }>`
Internal method to send a request to the API. You can use it to send a custom request, but you'll have to handle the formdata yourself.

## Using proxy
You can use undici dispatcher to proxy requests. Here's an example:
```javascript
import Lens from 'chrome-lens-ocr';
import { ProxyAgent } from 'undici';

const lens = new Lens({
    dispatcher: new ProxyAgent('http://example:example@example.com:8080')
});
```

## Using your cookies
You can use your own cookies to be authorized in Google. This is optional. Here's an example:
```javascript
import Lens from 'chrome-lens-ocr';

const lens = new Lens({
    headers: {
        'cookie': 'your_cookies_here'
    }
});
```

## Options
Options can be empty, or contain the following (default values):
```javascript
{
  chromeVersion: '121.0.6167.140', // Version of Chromium to "use"
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', // user agent to use, major Chrome version should match the previous value
  headers: {}, // you can add headers here, they'll override the default ones
  dispatcher: undefined, // you can use undici dispatcher to proxy requests
}
```

## Custom Sharex OCR
It's possible to use this package with Sharex to OCR images using Google Lens API, instead of bad default OCR in Sharex. Please refer to [SHAREX.md](SHAREX.md) for instructions.