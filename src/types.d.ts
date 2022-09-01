declare global {
	var tmi: { Client: TmiJS.Client };
	var tmiClient: TmiJS.Client;
}

export interface Emote {
	code: string;
	id: string;
	provider: 'twitch' | 'ffz' | 'bttv' | '7tv';
	url: [ string, null, null ] | [ string, string, null ] | [ string, string, string ] | [ string, null, string ];
	width?: number;
	height?: number;
	isZeroWidth?: boolean;
}

export interface EmoteInUse extends Emote {
	start: number;
	end: number;
}

export namespace TmiJS {
	interface Config {
		options?: {
			debug?: boolean;
			skipMembership?: boolean;
		};
		connection?: {
			// TODO
		};
		identiy?: {
			username: string;
			password: string;
		};
		channels?: string[];
	}
	export namespace Tags {
		interface BadgeInfo {
			subscriber: string;
			founder: string;
		}
		interface Badges {
			broadcaster: string;
			moderator: string;
			subscriber: string;
			founder: string;
			turbo: string;
			premium: string;
		}
		interface EmotesObject {
			[key: string]: string[];
		}
		export interface Message {
			'badge-info': BadgeInfo;
			'badge-info-raw': string;
			badges: Badges;
			'badges-raw': string;
			'client-nonce': string;
			color: `#${string}`;
			'display-name': string;
			emotes: EmotesObject | null;
			'first-msg': boolean;
			flags: string | null;
			id: string;
			'message-type': 'chat' | 'action' | 'whisper';
			/** @deprecated */
			mod: boolean;
			'returning-chatter': boolean;
			'room-id': string;
			subscriber: boolean;
			'tmi-sent-ts': string;
			/** @deprecated */
			turbo: boolean;
			'user-id': string;
			/** @deprecated */
			'user-type': 'mod' | 'global_mod' | 'admin' | 'staff' | '';
			username: string;
		}
		export interface Cheer extends Message {
			bits: number;
		}
	}
	interface Events {
		connected: [ server: string, port: number ];
		disconnected: [ reason: string ];
		message: [ channel: `#${string}`, tags: Tags.Message, message: string, self: boolean ];
		cheer: [ channel: `#${string}`, tags: Tags.Cheer, message: string ];
	}
	export interface Client {
		new(config: Config): Client;
		connect(): Promise<void>;
		on<K extends keyof Events>(event: K, callback: (...args: Events[K]) => void): void;
		removeAllListeners(): void;
		_isConnected(): boolean;
	}
}