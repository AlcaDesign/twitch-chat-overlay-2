<template lang="pug">
.chat-line(
	:class="{ 'is-action': message.type === 'action' }"
	:style="{ '--name-color': message.tags?.color }"
)
	//- TODO: Badges
	.badges
		.badge(
			v-for="(badge, i) in badges"
			:key="i"
			:style="{ backgroundImage: getBadgeUrl(badge) }"
		)
	.name {{ formattedName }}
	.content
		Thread(v-if="isThread")
		.part(
			v-for="part in parts"
			:class="getClassForPart(part)"
			:style="getStyleForPart(part)"
			:title="getTitleForPart(part)"
		) {{ getContentForPart(part) }}
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as twemoji from 'twemoji-parser';
import type { Emote, EmoteInUse, TmiJS } from '@/types';
import * as allThirdPartyEmotes from '@/lib/emotes';
import * as twitchBadges from '@/lib/badges';
// import * as helix from '@/lib/helix';
import Thread from './icon/twitch/Thread.vue';

export interface Message {
	type: 'system' | 'chat' | 'action' | 'cheer' | 'announcement' | 'sub' | 'resub' | 'raid';
	id: string;
	channel: string;
	userId: string;
	username: string;
	displayName: string;
	text: string;
	emotesTwitch: TmiJS.Tags.EmotesObject;
	tags: TmiJS.Tags.Message;
	badges: [ string, string ][];
}

type MessagePartTypes = 'text' | 'emote' | 'emoji' | 'cheermote';
interface MessagePartBase<Type extends MessagePartTypes> {
	type: Type;
}
interface MessagePartPieces {
	content: string;
	title: string;
	// style: StyleValue; // Causes issues
	style: { [key: string]: string };
}
type MessagePartGeneric<
	Type extends MessagePartTypes,
	Props extends keyof MessagePartPieces,
	Meta extends any = void
> = MessagePartBase<Type>
	& Pick<MessagePartPieces, Props>
	& (Meta extends Record<string, any> ? { meta: Meta } : {});
type MessagePartText = MessagePartGeneric<'text', 'content'>;
type MessagePartEmote = MessagePartGeneric<
	'emote',
	'style' | 'title',
	{ provider: EmoteInUse['provider']; zeroWidth?: boolean; }
>;
type MessagePartEmoji = MessagePartGeneric<'emoji', 'style' | 'title', { provider: 'twemoji' }>;
type MessagePart =
	| MessagePartText
	| MessagePartEmote
	| MessagePartEmoji

const fontScale = parseInt(window.getComputedStyle(document.body).getPropertyValue('font-size').slice(0, -2), 10) / 16;
const suggestedScale: 1 | 2 | 3 = ({ 1: 1, 2: 2, 3: 3, 4: 3 } as const)[Math.floor(fontScale)] || 1;

// const thirdPartyEmoteList = ref([] as Emote[]);
const thirdPartyEmoteMap = ref(new Map() as Map<Emote['code'], Emote>);
const _escapeRegex = /[-[\]{}()*+?.,\\^$|#\s]/g;
const thirdPartyEmoteRegex = ref(/./g);

const props = defineProps<{
	message: Message;
}>();
// defineEmits<{ (e: 'eventName'): void; }>();

const parts = ref<MessagePart[]>([]);
const badges = ref<string[]>([]);

const formattedName = (() => {
	const { displayName, username } = props.message;
	if(!displayName) {
		return username;
	}
	else if(displayName.toLowerCase() !== username) {
		return `${displayName} (${username})`;
	}
	return displayName || username;
})();

const isThread = 'reply-parent-msg-id' in props.message.tags;

const getBadgeUrl = (badge: string) => {
	return `url(${badge.replace(/1$/, suggestedScale.toString())})`;
};

onMounted(async () => {
	const channelName = props.message.channel.slice(1);
	await Promise.all([
		allThirdPartyEmotes.load(channelName)
		.then(emoteList => {
			thirdPartyEmoteMap.value = new Map(emoteList.map(e => [ e.code, e ]));
			const regexAlternates = emoteList.map(e => e.code.replace(_escapeRegex, '\\$&'))
			.sort((a, b) => b.length - a.length)
			.join('|');
			thirdPartyEmoteRegex.value = new RegExp(`(?:${regexAlternates})`, 'g');
			parts.value = parseMessageIntoParts(props.message);
		}),
		twitchBadges.load(channelName)
		.then(badgeData => {
			badges.value = props.message.badges.reduce((p, [ name, version ]) => {
				const badge = badgeData[name][version];
				if(badge) {
					p.push(badge);
				}
				return p;
			}, [] as string[]);
		}),
	]);
});

function getContentForPart(part: MessagePart) {
	return part.type === 'text' ? part.content : '';
}

function getClassForPart(part: MessagePart) {
	const { type } = part;
	return {
		[`part-${type}`]: true,
		'emote-zero-width': type === 'emote' ? part.meta.zeroWidth : false
	};
}

function getStyleForPart(part: MessagePart) {
	// if(part.type === 'emote') {
	// 	part.
	// }
	return part.type !== 'text' ? part.style : {};
}

function getTitleForPart(part: MessagePart) {
function getBestEmoteUrl(url: Emote['url']): string {
	const scale = suggestedScale - 1;
	if(scale === 0) {
		return url[0];
	}
	else if(scale === 1) {
		return url[1] || url[0];
	}
	return url[2] || url[1] || url[0];
}

function parseMessageIntoParts(message: Message): MessagePart[] {
	const realText = message.text.replace(/\uDB40\uDC02/g, '\u200D');
	const text: string[] = [ ...realText ];
	const parts: MessagePart[] = [ { type: 'text', content: realText } ];
	const { emotesTwitch } = message;
	const emotes = convertTwitchEmotes(emotesTwitch, realText);
	// if(message.type === 'cheer') {}

	// Parse Twitch emotes:
	if(emotes.length) {
		parts.splice(0);
		emotes.sort((a, b) => a.start - b.start);
		if(emotes[0].start > 0) {
			const content = text.slice(0, emotes[0].start).join('').trim();
			if(content) {
				parts.push({ type: 'text', content });
			}
		}
		for(let i = 0; i < emotes.length; i++) {
			const emote = emotes[i];
			const { end, code, url, provider } = emote;
			parts.push({
				type: 'emote',
				style: {
					backgroundImage: `url(${url})`,
				},
				title: code,
				meta: { provider },
			});
			if(end === text.length) {
				continue;
			}
			const nextEmote = emotes[i + 1];
			const content = (nextEmote ? text.slice(end, nextEmote.start) : text.slice(end)).join('').trim();
			if(content) {
				parts.push({ type: 'text', content });
			}
		}
	}

	// Parse emoji:
	parts.reduceRight((_, n, i) => {
		if(n.type !== 'text' || !n.content.trim()) {
			return undefined;
		}
		const emojiList = twemoji.parse(n.content, { assetType: 'svg' });
		if(emojiList.length) {
			const newParts: MessagePart[] = [];
			const text = n.content;
			if(emojiList[0].indices[0] > 0) {
				newParts.push({
					type: 'text',
					content: text.slice(0, emojiList[0].indices[0]),
				});
			}
			for(let i = 0; i < emojiList.length; i++) {
				const { indices: [ _start, end ], text: code, url } = emojiList[i];
				newParts.push({
					type: 'emoji',
					style: {
						backgroundImage: `url(${url})`,
					},
					title: code,
					meta: { provider: 'twemoji' },
				});
				// if(end === text.length) {
				// 	continue;
				// }
				const nextEmoji = emojiList[i + 1];
				const content = nextEmoji ? text.slice(end, nextEmoji.indices[0]) : text.slice(end);
				newParts.push({ type: 'text', content });
			}
			parts.splice(i, 1, ...newParts);
	}, undefined);

	// Parse third party emotes:
	parts.reduceRight((_, n, i) => {
		if(n.type !== 'text' || !n.content.trim()) {
			return undefined;
		}
		const reg = thirdPartyEmoteRegex.value;
		const str = n.content;
		let match: RegExpExecArray | null;
		const matches: EmoteInUse[] = [];
		while((match = reg.exec(str)) !== null) {
			const [ m ] = match;
			matches.push({
				...thirdPartyEmoteMap.value.get(m)!,
				start: match.index,
				end: match.index + m.length,
			});
		}
		if(!matches.length) {
			return undefined;
		}
		const newParts: MessagePart[] = [];
		const text = [ ...n.content ];
		if(matches[0].start > 0) {
			const content = text.slice(0, matches[0].start).join('').trim();
			if(content) {
				newParts.push({ type: 'text', content, });
			}
		}
		for(let i = 0; i < matches.length; i++) {
			const emote = matches[i];
			const { end, code, url, provider } = emote;
			const explicitSize: Partial<{ width: string; height: string; }> = {};
			if(emote.width !== undefined && emote.height !== undefined) {
				const scale = 1.5 / emote.height;
				explicitSize.width = `${emote.width * scale}rem`;
				explicitSize.height = `${1.5}rem`;
			}
			newParts.push({
				type: 'emote',
				style: {
					backgroundImage: `url(${getBestEmoteUrl(url)})`,
					...explicitSize
				},
				title: code,
				meta: { provider, zeroWidth: matches[i].isZeroWidth },
			});
			if(end === text.length) {
				continue;
			}
			const nextEmote = matches[i + 1];
			const content = (nextEmote ? text.slice(end, nextEmote.start) : text.slice(end)).join('').trim();
			if(content) {
				newParts.push({ type: 'text', content });
			}
		}
		parts.splice(i, 1, ...newParts);
	}, undefined);
	return parts;
}

function convertTwitchEmotes(originalEmotes: TmiJS.Tags.EmotesObject, text: string): EmoteInUse[] {
	const spreadText = [ ...text ];
	const entries = Object.entries(originalEmotes);
	return entries.reduce((p, [ id, indices ]) => {
		const parseEmoteIndex = (n: string) => {
			const [ start, end ] = n.split('-');
			return { start: +start, end: +end + 1 };
		};
		const first = parseEmoteIndex(indices[0]);
		const code = spreadText.slice(first.start, first.end).join('');
		const baseUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark`;
		const base: Pick<Emote, 'code' | 'id' | 'provider' | 'url'> = {
			code,
			id,
			provider: 'twitch',
			url: [ `${baseUrl}/1.0`, `${baseUrl}/2.0`, `${baseUrl}/3.0` ],
		};
		indices.forEach(n => {
			p.push({
				...parseEmoteIndex(n),
				...base,
			});
		});
		return p;
	}, [] as EmoteInUse[]);
}

</script>
<style lang="scss" scoped>
.chat-line {
	--name-color: #00b0f4;

	& + & {
		margin-top: 0.075rem;
	}
	& > div {
		vertical-align: middle;
	}
}

.badges {
	display: inline-block;
	margin-right: 0.2rem;
	line-height: 0;

	&:empty {
		margin-right: 0;
	}
}
.badge {
	display: inline-block;
	vertical-align: middle;
	width: 1.125rem;
	height: 1.125rem;
	background-size: contain;
	background-repeat: no-repeat;
	background-position: center;

	& + & {
		margin-left: 0.125rem;
	}
}

.name {
	font-weight: bold;
	display: inline-block;
	color: var(--name-color);

	&:after {
		content: ':';
		margin-right: 0.25rem;
	}
}

.content {
	display: inline;
	overflow-wrap: break-word;
}
.is-action {
	.name:after {
		content: '';
	}
	.content {
		font-style: italic;
		color: var(--name-color);
	}
}

.part {
	display: inline;
	vertical-align: middle;

	&-text {}
	&-emote,
	&-emoji {
		display: inline-block;
		width: 1.5rem;
		height: 1.5rem;
		background-size: contain;
		background-repeat: no-repeat;
		background-position: center;
	}
}
</style>