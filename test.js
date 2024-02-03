import Lens from './index.js';

const lens = new Lens();

lens.scanByFile('shrimple.png').then(t => {
    console.log('By file - ', t.includes('as shrimple as that'));
}).catch(console.error);