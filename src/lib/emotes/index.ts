import * as bttv from '@/lib/emotes/bttv';
import * as ffz from '@/lib/emotes/ffz';
import * as seventv from '@/lib/emotes/7tv';
import * as cache from '@/lib/emotes/cache';
import * as helix from '../helix';
import type { Emote } from '@/types';

export function load(twitchLogin: string): Promise<Emote[]> {
	const cachedEmotes = cache.get('final');
	if(cachedEmotes) {
		return cachedEmotes;
	}
	// const prom = ffz.getUserFromLogin(twitchLogin)
	const prom = helix.getUserByLogin(twitchLogin)
	.then(({ user: { id: twitchId, login: twitchLogin } }) =>
		Promise.all([
			ffz.load(),
			ffz.load(twitchId.toString()),
			bttv.load(),
			bttv.load(twitchId.toString()),
			seventv.load(),
			seventv.load(twitchLogin),
		])
	)
	.then(([ bg, bc, fg, fc, sg, sc ]) => [ ...bg, ...bc, ...fg, ...fc, ...sg, ...sc ]);
	cache.add('final', prom);
	return prom;
}