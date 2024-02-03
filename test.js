import Lens from './index.js';

const lens = new Lens();

lens.scanByURL('https://media.discordapp.net/attachments/1162079007177719981/1203343210487742564/IMG_20240128_135150_264.jpg?ex=65d0bfb2&is=65be4ab2&hm=ce1e230b739cad94835590a9eee22921a427bffb35f8f46bbb373231c04aba8f&=&format=webp&width=645&height=671').then(t => {
    console.log(t);
}).catch(console.error);