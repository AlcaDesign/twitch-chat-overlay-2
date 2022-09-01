const apiBase = 'https://helix-proxy.alca.tv';

async function makeRequest(endpoint: string) {
	const res = await fetch(`${apiBase}/${endpoint}`);
	return await res.json();
}

export async function getUserByLogin(login: string): Promise<{ user: Helix.User; }> {
	return await makeRequest(`users?login=${login}&user=true`);
}

export async function getBadgesGlobal(): Promise<Helix.BadgesSimple.BadgesData> {
	return await makeRequest(`chat/badges/global?simplify=true`);
}

export async function getBadgesChannel(channelId: string): Promise<Helix.BadgesSimple.BadgesData> {
	return await makeRequest(`chat/badges?broadcaster_id=${channelId}&simplify=true`);
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