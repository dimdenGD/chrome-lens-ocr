# Chrome Lens OCR
Package to use Google Lens OCR for free, via API used in Chromium.

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

## Options
Options can be empty, or contain the following (default values):
```javascript
{
  chromeVersion: '121.0.6167.140', // Version of Chromium to "use"
  majorChromeVersion: '121', // Major version of Chromium to "use", should match the previous value
  sbisrc: 'Google Chrome 121.0.6167.140 (Official) Windows', // browser string to use, version should match the previous value
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', // user agent to use, version should match the previous value
  endpoint: LENS_ENDPOINT, // endpoint to use, probably should not be changed
  viewport: [1920, 1080], // viewport to use, probably should not be changed
  headers: {}, // you can add headers here, they'll override the default ones
}
```