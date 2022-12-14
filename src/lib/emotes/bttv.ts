import type { Emote } from '@/types';
import * as cache from '@/lib/cache';

const apiBase = `https://api.betterttv.net/3/cached`;

export async function load(twitchId?: string): Promise<Emote[]> {
	if(twitchId) {
		return getChannelByTwitchId(twitchId);
	}
	return getGlobal();
}

function makeRequest(endpoint: string, expires?: number) {
	const url = `${apiBase}/${endpoint}`;
	const cachedData = cache.get(url);
	if(cachedData) {
		return cachedData;
	}
	const prom = fetch(url).then(res => res.json());
	cache.add(url, prom, expires);
	return prom;
}

async function _getChannelByTwitchId(twitchId: string): Promise<BTTV.GetChannelByTwitchId | BTTV.ApiError> {
	return await makeRequest(`users/twitch/${twitchId}`);
}
async function getChannelByTwitchId(twitchId: string): Promise<Emote[]> {
	const data = await _getChannelByTwitchId(twitchId);
	if('message' in data) {
		return [];
	}
	return [
		...data.channelEmotes.map(convertEmote),
		...data.sharedEmotes.map(convertEmote),
	];
}

async function _getGlobal(): Promise<BTTV.GetGlobal | BTTV.ApiError> {
	return await makeRequest('emotes/global');
}
async function getGlobal(): Promise<Emote[]> {
	const data = await _getGlobal();
	if('message' in data) {
		return [];
	}
	return data.map(convertEmote, 1000 * 60 * 60);
}

function convertEmote(emote: BTTV.Emote): Emote {
	const baseUrl = `https://cdn.betterttv.net/emote/${emote.id}`;
	return {
		url: [ `${baseUrl}/1x`, `${baseUrl}/2x`, `${baseUrl}/3x` ],
		code: emote.code,
		id: emote.id,
		provider: 'bttv',
	};
}

namespace BTTV {
	interface User {
		id: string;
		name: string;
		displayName: string;
		providerId: string;
	}
	interface EmoteBase {
		id: string;
		code: string;
		imageType: 'png' | 'gif';
	}
	interface EmoteWithUserId extends EmoteBase {
		userId: string;
	}
	interface EmoteWithUser extends EmoteBase {
		user: User;
	}
	export type Emote = EmoteWithUser | EmoteWithUserId;
	export interface ApiError {
		message: string;
	}
	export interface GetChannelByTwitchId {
		id: string;
		bots: string[];
		avatar: string;
		channelEmotes: EmoteWithUserId[];
		sharedEmotes: EmoteWithUser[];
	}
	export type GetGlobal = EmoteWithUserId[];
}