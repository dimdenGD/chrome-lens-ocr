#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import clipboardy from 'clipboardy';
import Lens from './src/index.js';
// import { sleep } from './src/utils.js';

function usage() {
    console.log('')
    console.log('Usage: chrome-lens-ocr [-d] ./path/to/image.png')
    console.log('       -d   Do not copy text to clipboard')
    return
}

async function main() {
    // get file path from command line
    const args = process.argv.slice(2);

    if (!args.length) {
        console.log('Get image texts using Google Lens and copy to clipboard.')
        usage();
        return;
    }

    const [arg0, arg1] = args;
    let file, copy = true;

    // if 1st arg is the switch, 2nd arg must exists
    if (arg0 === '-d') {
        if (arg1) {
            file = arg1
            copy = false
        } else {
            console.error('Image file path is not specified')
            usage()
            return
        }
    } else {
        file = arg0
    }

    // if 2nd arg is the switch, 1st arg must be the path
    if (arg1 === '-d') {
        copy = false
    }

    // get path to cookies file (should be in the same directory as this script)
    const moduleUrl = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(moduleUrl);
    const pathToCookies = path.join(__dirname, 'cookies.json');

    // check file access
    try {
        fs.accessSync(pathToCookies, fs.constants.R_OK | fs.constants.W_OK)
    } catch (error) {
        if (error.code === 'EACCES') {
            console.warn('Cannot write cookie, read/write permission denied in', pathToCookies)
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

    // scan file
    const text = await lens.scanByFile(file);
    const result = text.segments.map(s => s.text).join('\n')

    // write cookies to file
    fs.writeFileSync(
        pathToCookies,
        JSON.stringify(lens.cookies, null, 4),
        { encoding: 'utf8' }
    );

    // write text to clipboard
    if (copy) clipboardy.writeSync(result);

    console.log(result)
}

try {
    await main()
} catch (e) {
    console.error('Error occurred:');
    console.error(e);
    // await sleep(30000);
}
