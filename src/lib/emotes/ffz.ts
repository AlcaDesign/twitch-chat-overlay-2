import type { Emote } from '@/types';
import * as cache from '../cache';

const apiBase = 'https://api.frankerfacez.com/v1';

export async function load(twitchId?: string): Promise<Emote[]> {
	if(twitchId) {
		return getChannelByTwitchId(twitchId);
	}
	return getGlobalSet();
}

function makeRequest(endpoint: string, expires?: number): Promise<any> {
	const url = `${apiBase}/${endpoint}`;
	const cachedData = cache.get(url);
	if(cachedData) {
		return cachedData;
	}
	const prom = fetch(url).then(res => res.json());
	cache.add(url, prom, expires);
	return prom;
}

export async function getUserFromLogin(twitchLogin: string): Promise<FFZ.GetUserFromLogin> {
	return await makeRequest(`_user/${twitchLogin}`);
}

async function _getChannelByTwitchId(twitchId: string): Promise<FFZ.GetRoomByTwitchID | FFZ.ApiError> {
	return await makeRequest(`room/id/${twitchId}`);
}
async function getChannelByTwitchId(twitchId: string): Promise<Emote[]> {
	const data = await _getChannelByTwitchId(twitchId);
	if('error' in data) {
		return [];
	}
	return data.sets[data.room.set].emoticons.map(convertEmote);
}

async function _getGlobalSet(): Promise<FFZ.GetGlobalSet | FFZ.ApiError> {
	return await makeRequest('set/global', 1000 * 60 * 60);
}
async function getGlobalSet(): Promise<Emote[]> {
	const data = await _getGlobalSet();
	if('error' in data) {
		return [];
	}
	return data.default_sets.flatMap(n => data.sets[n].emoticons.map(convertEmote));
}

function convertEmote(emote: FFZ.Emote): Emote {
	return {
		url: [ emote.urls[1]!, emote.urls[2], emote.urls[4] ],
		code: emote.name,
		id: emote.id.toString(),
		provider: 'ffz',
		width: emote.width,
		height: emote.height,
	};
}

namespace FFZ {
	interface User {
		id: string;
		twitch_id: number;
		youtube_id: string | null;
		name: string;
		display_name: string | null;
		avatar: string | null;
		max_emoticons: number;
		is_donor: boolean;
		badges: number[];
		emote_sets: number[];
	}
	interface Badge {
		id: number;
		name: string;
		title: string;
		slot: number;
		replaces: string | null;
		color: string | null;
		image: string;
		urls: Record<'1' | '2' | '4', string | null>;
		css: string | null;
	}
	interface Room {
		_id: number;
		twitch_id: number;
		youtube_id: string | null;
		id: string;
		is_group: boolean;
		display_name: string | null;
		set: number;
		moderator_badge: string | null;
		vip_badge: Record<'1' | '2' | '4', string | null> | null;
		mod_urls: Record<'1' | '2' | '4', string | null> | null;
		user_badges: {};
		user_badges_ids: {};
		css: string | null;
	}
	interface EmoteSet {
		id: number;
		_type: number;
		icon: string | null;
		title: string | null;
		css: string | null;
		emoticons: Emote[];
	}
	export interface Emote {
		id: number;
		name: string;
		height: number;
		width: number;
		public: boolean;
		hidden: boolean;
		modifier: boolean;
		offset: string | null;
		margins: string | null;
		css: string | null;
		owner: {
			_id: number;
			name: string;
			display_name: string | null;
		} | null;
		// [key: Key extends '1' | '2' | '4']: `//cdn.frankerfacez.com/emote/${number}/${Key}`;
		urls: { [Key in '1' | '2' | '4']: `//cdn.frankerfacez.com/emote/${number}/${Key}` | null; };
		animated: { [Key in '1' | '2' | '4']: `//cdn.frankerfacez.com/emote/${number}/${Key}` | null; };
		status: number;
		usage_count: number;
		created_at: string;
		last_updated: string;
	}
	export interface ApiError {
		error: string;
		message: string;
		status: string;
	}
	export interface GetUserFromLogin {
		user: User;
	}
	export interface GetRoomByTwitchID {
		room: Room;
		sets: Record<EmoteSet['id'], EmoteSet>;
	}
	export interface GetGlobalSet {
		default_sets: number[];
		sets: Record<EmoteSet['id'], EmoteSet>;
		users: Record<EmoteSet['id'], string[]>;
	}
}