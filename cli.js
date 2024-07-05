#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import clipboardy from 'clipboardy';
import Lens from './src/index.js';

let image, shouldCopy = true;

async function cli(args) {
    if (args.includes('-d')) {
        args.splice(args.indexOf('-d'), 1)
        shouldCopy = false
    }

    // check empty arguments at last
    if (!args.length || args.includes('-h') || args.includes('--help')) {
        console.log('Scan text from image using Google Lens and copy to clipboard.')
        console.log('')
        console.log('USAGE:')
        console.log('    chrome-lens-ocr [-d] ./path/to/image.png')
        console.log('    chrome-lens-ocr [-d] https://domain.tld/image.png')
        console.log('    chrome-lens-ocr --help')
        console.log('ARGS:')
        console.log('    -d         Do not copy text to clipboard')
        console.log('    -h, --help Show this message')
        return
    }

    // hope the last argument is the image
    image = args[0]

    // get path to cookies file (should be in the same directory as this script)
    const moduleUrl = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(moduleUrl);
    const pathToCookies = path.join(__dirname, 'cookies.json');

    // check file access
    try {
        fs.accessSync(pathToCookies, fs.constants.R_OK | fs.constants.W_OK)
    } catch (error) {
        if (error.code === 'EACCES') {
            console.warn(
                'Cannot write cookie, read/write permission denied in',
                pathToCookies
            )
        }
    }

    // read cookies from file
    let cookie;

    if (fs.existsSync(pathToCookies)) {
        cookie = JSON.parse(fs.readFileSync(pathToCookies, 'utf8'));
    }

    // create lens instance, with cookie if exists
    const lensOptions = cookie ? { headers: { cookie } } : {}
    const lens = new Lens(lensOptions);
    let text

    // remove Windows drive prefix because false positive
    if (URL.canParse(image.replace(/^\w{1}:/, ''))) {
        text = await lens.scanByURL(image)
    } else {
        text = await lens.scanByFile(image)
    }

    const result = text.segments.map(s => s.text).join('\n')

    // write cookies to file
    fs.writeFileSync(
        pathToCookies,
        JSON.stringify(lens.cookies, null, 4),
        { encoding: 'utf8' }
    );

    // write text to clipboard
    if (shouldCopy) {
        clipboardy.writeSync(result);
    }

    console.log(result)
    return result
}

// only run if directly executed
if (fileURLToPath(import.meta.url) === process.argv[1]) {
    try {
        const args = process.argv.slice(2);
        await cli(args)
    } catch (e) {
        console.error('Error occurred:');
        console.error(e);
    }
}

export default cli
