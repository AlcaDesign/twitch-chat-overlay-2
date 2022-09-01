import * as bttv from '@/lib/emotes/bttv';
import * as ffz from '@/lib/emotes/ffz';
import * as seventv from '@/lib/emotes/7tv';
import * as cache from '@/lib/cache';
import * as helix from '../helix';
import type { Emote } from '@/types';

export function load(twitchLogin: string): Promise<Emote[]> {
	const cacheKey = `emotes:final:${twitchLogin}`;
	const cachedEmotes = cache.get(cacheKey);
	if(cachedEmotes) {
		return cachedEmotes;
	}
	const prom = helix.getUserByLogin(twitchLogin)
	.then(async ({ user: { id: twitchId, login: twitchLogin } }) => {
		const [ bg, bc, fg, fc, sg, sc ] = await Promise.all([
			ffz.load(),
			ffz.load(twitchId.toString()),
			bttv.load(),
			bttv.load(twitchId.toString()),
			seventv.load(),
			seventv.load(twitchLogin),
		]);
		return [ ...bg, ...bc, ...fg, ...fc, ...sg, ...sc ];
	});
	cache.add(cacheKey, prom);
	return prom;
}