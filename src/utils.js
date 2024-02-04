export function setDefault (obj, key, value) {
    if(!obj[key]) {
        obj[key] = value;
    }
}

export function parseCookies(cookies) {
	return cookies.split('; ').reduce((prev, current) => {
		const [name, ...value] = current.split('=');
		prev[name] = value.join('=');
		return prev;
	}, {});
}

export function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}