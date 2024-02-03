import Lens from './index.js';

const lens = new Lens();

lens.scanByURL('https://pbs.twimg.com/media/GFaoSKAXkAAcP7V.jpg?name=orig').then(t => {
    console.log(t);
}).catch(console.error);