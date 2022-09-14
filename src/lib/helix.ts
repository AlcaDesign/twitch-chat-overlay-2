import * as cache from '@/lib/cache';

const apiBase = 'https://helix-proxy.alca.tv';

async function makeRequest(endpoint: string, expires?: number) {
	const url = `${apiBase}/${endpoint}`;
	const cachedData = cache.get(url);
	if(cachedData) {
		return cachedData;
	}
	const prom = fetch(url).then(res => res.json());
	if(expires && expires > 0) {
		cache.add(url, prom, expires);
	}
	else if(expires && expires < 0) {
		cache.add(url, prom, null);
	}
	return prom;
}

export async function getUserByLogin(login: string): Promise<{ user: Helix.User; }> {
	return await makeRequest(`users?login=${login}&user=true`, 1000 * 60 * 60 * 2);
}

export async function getBadgesGlobal(): Promise<Helix.BadgesSimple.BadgesData> {
	return await makeRequest(`chat/badges/global?simplify=true`, 1000 * 60 * 60 * 4);
}

export async function getBadgesChannel(channelId: string): Promise<Helix.BadgesSimple.BadgesData> {
	return await makeRequest(`chat/badges?broadcaster_id=${channelId}&simplify=true`, 1000 * 60 * 60 * 2);
}

export async function getChatColor(userId: string | string[]): Promise<Helix.ChatColorSimple> {
	if(!Array.isArray(userId)) {
		userId = [ userId ];
	}
	const cacheKeyBase = `api:chat-color`;
	const formKey = (id: string) => `${cacheKeyBase}:${id}`;
	const refetch: string[] = [];
	const cached: Record<string, string> = {};
	for(const id of userId) {
		const cachedData = cache.get(formKey(id));
		if(cachedData) {
			cached[id] = await cachedData;
		}
		else {
			refetch.push(id);
		}
	}
	if(refetch.length) {
		const userIdList = new URLSearchParams(refetch.map(id => [ 'user_id', id ]));
		const resData: Helix.ChatColorSimple = await makeRequest(`chat/color?${userIdList}&colors=true`, 0);
		for(const id of userId) {
			if(!resData[id]) {
				resData[id] = '';
			}
			cached[id] = resData[id];
			const prom = Promise.resolve(resData[id]);
			cache.add(formKey(id), prom, 1000 * 60 * 60);
		}
	}
	return cached;
}

export async function getCheermotes(userId: string): Promise<Helix.CheermotesSimple> {
	return await makeRequest(`bits/cheermotes?broadcaster_id=${userId}&prefixes=true`, 1000 * 60 * 60 * 12);
}

export async function resolveIdFromName(name: string, id?: string): Promise<string> {
	if(id) {
		return id;
	}
	const { user: { id: resolvedId } } = await getUserByLogin(name);
	return resolvedId;
}

export namespace Helix {
	export interface User {
		id: string;
		login: string;
		display_name: string;
		type: '';
		broadcaster_type: '' | 'partner' | 'affiliate';
		description: string;
		/** Replace "-300x300.png" at the end of the URL */
		profile_image_url: string;
		/**
		 * Replace "-1920x1080.png/jpeg" at the end of the URL
		 * Possibly empty string.
		 */
		offline_image_url: string;
		/** @deprecated Stale data */
		view_count: number;
		created_at: string;
		/** Behind a scope. */
		email?: string;
	}
	export namespace BadgesSimple {
		export type Badge = Record<string, string>;
		export type BadgeSet = Record<string, Badge>;
		export interface BadgesData {
			badges: BadgeSet;
		}
	}
	export interface ChatColorSimple {
		[userId: string]: string;
	}
	export interface CheermotesSimple {
		prefixes: string[];
	}
}