import * as cache from '@/lib/cache';
import * as helix from '@/lib/helix';

export function load(twitchLogin: string, twitchId?: string): Promise<Record<string, Record<string, string>>> {
	const cacheKey = `badges:final:${twitchLogin}`;
	const cachedBadges = cache.get(cacheKey);
	if(cachedBadges) {
		return cachedBadges;
	}
	const prom = helix.resolveIdFromName(twitchLogin, twitchId)
	.then(async id => {
		const [ bg, bc ] = await Promise.all([
			helix.getBadgesGlobal(),
			helix.getBadgesChannel(id),
		]);
		const output = Object.entries(bg.badges).reduce((p, [ set, setBadges ]) => {
			p[set] = { ...setBadges };
			return p;
		}, {} as Record<string, Record<string, string>>);
		for(const [ setId, set ] of Object.entries(bc.badges)) {
			if(!output[setId]) {
				output[setId] = {};
			}
			for(const [ version, url ] of Object.entries(set)) {
				output[setId][version] = url;
			}
		}
		return output;
	});
	cache.add(cacheKey, prom);
	return prom;
}