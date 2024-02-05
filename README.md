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
All methods above return `{ language: String, text_segments: Array<String> }` object. Language is 2-letter ISO code, text_segments is an array of strings, each representing a line of text. In case error happened during the process, `LensError` will be thrown (instance of it is exported in the module).

## Methods and properties
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

#### `cookies`
This property contains object with cookies that are set for the instance. You can use it to save and load cookies to avoid doing the consent process every time.

## Using proxy
You can use undici dispatcher to proxy requests if using Node 18 or newer. Here's an example:
```javascript
import Lens from 'chrome-lens-ocr';
import { ProxyAgent } from 'undici';

const lens = new Lens({
    dispatcher: new ProxyAgent('http://user:pass@example.com:8080')
});
```
If you're using versions prior to Node 18 you need to use the http proxy:
```javascript
import Lens from 'chrome-lens-ocr';
import { HttpProxyAgent } from 'http-proxy-agent';

const lens = new Lens({
    agent: new HttpProxyAgent('http://user:pass@example.com:8080')
});
```

## Using your cookies
You can use your own cookies to be authorized in Google. This is optional. Here's an example:
```javascript
import Lens from 'chrome-lens-ocr';

const lens = new Lens({
    headers: {
        // 'cookie' is the only 'special' header that can also accept an object, all other headers should be strings
        'cookie': '__Secure-ENID=17.SE=-dizH-; NID=511=---bcDwC4fo0--lgfi0n2-' // way #1
        'cookie': { // way #2, better because you can set expiration date and it will be automatically handled, all 3 fields are required in this way
            '__Secure-ENID': {
                name: '__Secure-ENID',
                value: '17.SE=-dizH-',
                expires: 1634025600,
            },
            'NID': {
                name: 'NID',
                value: '511=---bcDwC4fo0--lgfi0n2-',
                expires: 1634025600,
            }
        }
    }
});
```

## Headless
You can use this library in environments which don't support Node.js API's by importing only the core, which doesn't include the "scanBy" utility functions:
```javascript
import LensCore from 'chrome-lens-ocr/src/core.js';

const lens = new LensCore();
lens.scanByData(new Uint8Array([41, 40, 236, 244, 151, 101, 118, 16, 37, 138, 199, 229, 2, 75, 33]), 'myImage.png', 'image/png');
```

## Options
Options can be empty, or contain the following (default values):
```javascript
{
  chromeVersion: '121.0.6167.140', // Version of Chromium to "use"
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', // user agent to use, major Chrome version should match the previous value
  headers: {}, // you can add headers here, they'll override the default ones
  dispatcher: undefined, // you can use undici dispatcher to proxy requests if using node 18 or later with built-in fetch
  agent: undefined, // you can use http agent to proxy requests if using node-fetch before node 18
}
```

## Additional information
In some of the EU countries, using any Google services requires cookie consent. This library handles it automatically, but it's pretty slow on first scan of the instance. So if you make a lot of new instances or always need it to be fast on first launch, you need to save cookies somewhere to avoid this. There's an example of how to do it in [sharex.js](https://github.com/dimdenGD/chrome-lens-ocr/blob/main/sharex.js).

## Custom Sharex OCR
It's possible to use this package with Sharex to OCR images using Google Lens API, instead of bad default OCR in Sharex. Please refer to [SHAREX.md](https://github.com/dimdenGD/chrome-lens-ocr/blob/main/SHAREX.md) for instructions.