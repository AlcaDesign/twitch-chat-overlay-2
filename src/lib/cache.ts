const cache: Map<string, { expires: number; res: Promise<any>; }> = new Map();

let timer: ReturnType<typeof setInterval> | null = null;

export function startTimer() {
	timer = setInterval(cull, 1000 * 60 * 5);
}

export function stopTimer() {
	clearInterval(timer!);
}

export function cull() {
	const now = Date.now();
	for(const [ key, { expires }] of cache) {
		if(expires <= now) {
			cache.delete(key);
		}
	}
}

export function add(key: string, res: Promise<any>, expires: number = 1000 * 60 * 5) {
	cache.set(key, { expires: Date.now() + expires, res });
	return res;
}

export function get(key: string) {
	if(!cache.has(key)) return null;
	const now = Date.now();
	const { expires, res } = cache.get(key)!;
	if(expires <= now) {
		cache.delete(key);
		return null;
	}
	return res;
}