import clipboardy from 'clipboardy';
import { sleep } from './src/utils.js'
import cli from './cli.js'

try {
    const args = process.argv.slice(2)
    const result = await cli(args)

    clipboardy.writeSync(result)
} catch (e) {
    console.error('Error occurred:')
    console.error(e)
    await sleep(30000)
}
