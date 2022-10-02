import * as cache from '@/lib/cache';
import * as helix from '@/lib/helix';

export function load(twitchLogin: string, twitchId?: string): Promise<helix.Helix.CheermotesSimple> {
	const cacheKey = `cheermotes:final:${twitchLogin}`;
	const cachedBadges = cache.get(cacheKey);
	if(cachedBadges) {
		return cachedBadges;
	}
	const prom = helix.resolveIdFromName(twitchLogin, twitchId)
	.then(async id => helix.getCheermotes(id));
	cache.add(cacheKey, prom, 1000 * 60 * 60 * 12);
	return prom;
}