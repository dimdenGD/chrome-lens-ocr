# Chrome Lens API
Package to use Google Lens OCR for free, via API used in Chromium.

## Installation
```bash
npm i chrome-lens-api
```

## Usage
```javascript
import Lens from 'chrome-lens-api';

const lens = new Lens();

lens.scanByFile('shrimple.png').then(console.log).catch(console.error);
lens.scanByURL('https://lune.dimden.dev/7949f833fa42.png').then(console.log).catch(console.error); // this will fetch the image and then scan it
lens.scanByBuffer(Buffer.from('...')).then(console.log).catch(console.error);
```