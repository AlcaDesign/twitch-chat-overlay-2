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
			subscriber?: string;
			founder?: string;
		}
		interface Badges {
			broadcaster?: string;
			moderator?: string;
			subscriber?: string;
			founder?: string;
			turbo?: string;
			premium?: string;
		}
		interface EmotesObject {
			[key: string]: string[];
		}
		export interface Message {
			'badge-info'?: BadgeInfo;
			'badge-info-raw'?: string;
			badges?: Badges;
			'badges-raw'?: string;
			'client-nonce': string;
			color?: string | null;
			'display-name': string;
			emotes: EmotesObject | null;
			'emotes-raw'?: string;
			'first-msg': boolean;
			flags: string | null;
			id: string;
			'message-type': 'chat' | 'action'; // | 'whisper';
			/** @deprecated */
			mod?: boolean;
			'reply-parent-display-name'?: string;
			'reply-parent-msg-body'?: string;
			'reply-parent-msg-id'?: string;
			'reply-parent-user-id'?: string;
			'reply-parent-user-login'?: string;
			'returning-chatter': boolean;
			'room-id': string;
			subscriber: boolean;
			'tmi-sent-ts': string;
			/** @deprecated */
			turbo?: boolean;
			'user-id': string;
			/** @deprecated */
			'user-type'?: 'mod' | 'global_mod' | 'admin' | 'staff' | '';
			username: string;
		}
		export interface Cheer extends Message {
			bits: number;
		}
		// @badge-info=subscriber/51;badges=moderator/1,subscriber/48,partner/1;color=#DAA520;display-name=C3PO;emotes=;flags=;id=5e2cfe30-a312-4f3a-9bf5-1d0421d26b6c;login=c3po;mod=1;msg-id=announcement;msg-param-color=PRIMARY;room-id=151819490;subscriber=1;system-msg=;tmi-sent-ts=1663140826105;user-id=200276677;user-type=mod :tmi.twitch.tv USERNOTICE #keeoh :Prediction Ended! The result was HEADS, starting a new prediction!
		// @badge-info=subscriber/51;badges=moderator/1,subscriber/48,partner/1;color=#DAA520;display-name=C3PO;emotes=;flags=;id=48671ef7-f56f-4dfe-a44f-70de7c21dab9;login=c3po;mod=1;msg-id=announcement;room-id=151819490;subscriber=1;system-msg=;tmi-sent-ts=1663142287862;user-id=200276677;user-type=mod :tmi.twitch.tv USERNOTICE #keeoh :Prediction Ended! The result was HEADS, starting a new prediction!
		export interface Announcement {
			'badge-info'?: BadgeInfo;
			'badge-info-raw'?: string;
			badges?: Badges;
			'badges-raw'?: string;
			color?: string;
			'display-name': string;
			emotes: EmotesObject | null;
			'emotes-raw'?: string;
			flags: string | null;
			id: string;
			login: string;
			'message-type': 'announcement';
			mod: boolean;
			'msg-id': 'announcement';
			'msg-param-color'?: 'PRIMARY' | 'SECONDARY';
			'room-id': string;
			subscriber: boolean;
			'system-msg': null;
			'tmi-sent-ts': string;
			'user-id': string;
			/** @deprecated */
			'user-type'?: 'mod' | 'global_mod' | 'admin' | 'staff' | '';
		}
		export interface Ban {
			'room-id': string;
			'target-user-id': string;
			'tmi-sent-ts': string;
		}
		export interface Timeout {
			'ban-duration': number;
			'room-id': string;
			'target-user-id': string;
			'tmi-sent-ts': string;
		}
		export interface MessageDeleted {
			login: string;
			'room-id': string;
			'target-msg-id': string;
			'tmi-sent-ts': string;
		}
		/** Unused in tmi.js */
		export interface ClearChat {
			'room-id': string;
			'tmi-sent-ts': string;
		}
	}
	type ChannelString = `#${string}`;
	interface Events {
		announcement: [ channel: ChannelString, tags: Tags.Announcement, msg: string, self: false, color: string ];
		cheer: [ channel: ChannelString, tags: Tags.Cheer, message: string ];
		connected: [ server: string, port: number ];
		disconnected: [ reason: string ];
		join: [ channel: ChannelString, username: string, self: boolean ];
		message: [ channel: ChannelString, tags: Tags.Message, message: string, self: boolean ];
		ban: [ channel: ChannelString, username: string, reason: null, tags: Tags.Ban ];
		clearchat: [ channel: ChannelString ];
		messagedeleted: [ channel: ChannelString, username: string, deletedMessage: string, tags: Tags.MessageDeleted ];
		timeout: [ channel: ChannelString, username: string, reason: null, duration: number, tags: Tags.Timeout ];
	}
	export interface Client {
		new(config: Config): Client;
		connect(): Promise<void>;
		on<K extends keyof Events>(event: K, callback: (...args: Events[K]) => void): void;
		removeAllListeners(): void;
		private _isConnected(): boolean;
		private _onMessage({ data: string }): void;
	}
}