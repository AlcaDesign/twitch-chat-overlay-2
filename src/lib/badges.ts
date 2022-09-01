import * as cache from '@/lib/emotes/cache';
import * as helix from './helix';

export function load(twitchLogin: string): Promise<Record<string, Record<string, string>>> {
	const cacheKey = `badges:final:${twitchLogin}`;
	const cachedBadges = cache.get(cacheKey);
	if(cachedBadges) {
		return cachedBadges;
	}
	const prom = helix.getUserByLogin(twitchLogin)
	.then(async ({ user: { id: twitchId } }) => {
		const [ bg, bc ] = await Promise.all([
			helix.getBadgesGlobal(),
			helix.getBadgesChannel(twitchId),
		]);
		const output: Record<string, Record<string, string>> = Object.entries(bg.badges).reduce((p, [ set, setBadges ]) => {
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