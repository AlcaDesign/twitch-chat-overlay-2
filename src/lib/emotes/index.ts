import * as bttv from '@/lib/emotes/bttv';
import * as ffz from '@/lib/emotes/ffz';
import * as seventv from '@/lib/emotes/7tv';
import * as cache from '@/lib/cache';
import * as helix from '@/lib/helix';
import type { Emote } from '@/types';

export function load(twitchLogin: string, twitchId?: string): Promise<Emote[]> {
	const cacheKey = `emotes:final:${twitchLogin}`;
	const cachedEmotes = cache.get(cacheKey);
	if(cachedEmotes) {
		return cachedEmotes;
	}
	const prom = helix.resolveIdFromName(twitchLogin, twitchId)
	.then(async userId => {
		const emoteGroups = await Promise.all([
			ffz.load(), ffz.load(userId),
			bttv.load(), bttv.load(userId),
			seventv.load(), seventv.load(twitchLogin),
		]);
		return emoteGroups.flat();
	});
	cache.add(cacheKey, prom);
	return prom;
}