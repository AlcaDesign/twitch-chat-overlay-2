import type { Emote } from '@/types';
import * as cache from '@/lib/cache';

const apiBase = 'https://api.7tv.app/v2';

export async function load(twitchLogin?: string): Promise<Emote[]> {
	if(twitchLogin) {
		return getChannelByTwitchLogin(twitchLogin);
	}
	return getGlobal();
}

function makeRequest(endpoint: string, expires?: number) {
	const url = `${apiBase}/${endpoint}`;
	const cachedData = cache.get(url);
	if(cachedData) {
		return cachedData;
	}
	const prom = fetch(url, {
		headers: {
			'X-SevenTV-Platform': 'an-alca-chat-client',
			'X-SevenTV-Version': '2.0.0',
		},
	})
	.then(res => res.json());
	cache.add(url, prom, expires);
	return prom;
}

async function _getChannelByTwitchLogin(twitchLogin: string): Promise<SevenTV.GetRoomByTwitchLogin | SevenTV.ApiError> {
	return await makeRequest(`users/${twitchLogin}/emotes`);
}
async function getChannelByTwitchLogin(twitchLogin: string): Promise<Emote[]> {
	const data = await _getChannelByTwitchLogin(twitchLogin);
	if('error' in data) {
		return [];
	}
	return data.map(convertEmote);
}

async function _getGlobal(): Promise<SevenTV.GetGlobal | SevenTV.ApiError> {
	return await makeRequest('emotes/global', 1000 * 60 * 60);
}
async function getGlobal(): Promise<Emote[]> {
	const data = await _getGlobal();
	if('error' in data) {
		return [];
	}
	return data.map(convertEmote);
}

function convertEmote(emote: SevenTV.Emote): Emote {
	const [ one, two, three ] = emote.urls.map(n => n[1]);
	return {
		url: [ one, two, three ],
		code: emote.name,
		id: emote.id,
		provider: '7tv',
		width: emote.width[0],
		height: emote.height[0],
		isZeroWidth: emote.visibility_simple.includes('ZERO_WIDTH'),
	};
}

namespace SevenTV {
	interface Role {
		id: string;
		name:
			| 'Default'
			| 'NULL'
			| 'Verified'
			| 'Subscriber'
			| 'Moderator'
			| 'Admin'
			| 'Dungeon Mistress';
		position:
			| 0
			| 0
			| 1
			| 3
			| 50
			| 75
			| 100;
		/** Integer value of Hex color */
		color: 0;
		allowed: 0;
		denied: 0;
	}
	interface User {
		id: string;
		twitch_id: string;
		login: string;
		display_name: string;
		role: Role;
	}
	export interface Emote {
		id: string;
		name: string;
		owner: User;
		visibility: number;
		visibility_simple: ('ZERO_WIDTH')[];
		mime: `image/${'webp'}`;
		status: number;
		tags: null;
		width: [ number, number, number, number ];
		height: [ number, number, number, number ];
		urls: [ [ '1' | '2' | '3' | '4', string ] ];
	}
	export interface ApiError {
		error: string;
		error_code: number;
		status: string;
		status_code: number;
	}
	export type GetRoomByTwitchLogin = Emote[];
	export type GetGlobal = Emote[];
}