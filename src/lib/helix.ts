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
	return await makeRequest(`users?login=${login}&user=true`, 1000 * 60 * 60);
}

export async function getBadgesGlobal(): Promise<Helix.BadgesSimple.BadgesData> {
	return await makeRequest(`chat/badges/global?simplify=true`, 1000 * 60 * 60);
}

export async function getBadgesChannel(channelId: string): Promise<Helix.BadgesSimple.BadgesData> {
	return await makeRequest(`chat/badges?broadcaster_id=${channelId}&simplify=true`, 1000 * 60 * 60);
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
}