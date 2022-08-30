<template lang="pug">
.chat-line
	.name {{ formattedName }}
	.content
		.part(
			v-for="part in parts"
			:class="getClassForPart(part)"
			:style="getStyleForPart(part)"
			:title="getTitleForPart(part)"
		) {{ getContentForPart(part) }}
</template>
<script setup lang="ts">
export interface Message {
	type: 'system' | 'chat' | 'action' | 'cheer' | 'announcement' | 'sub' | 'resub' | 'raid';
	id: string;
	channel: string;
	userId: string;
	username: string;
	displayName: string;
	text: string;
	emotesTwitch: TmiJS.Tags.EmotesObject;
}

import { onMounted, ref } from 'vue';
import * as twemoji from 'twemoji-parser';
import type { Emote, EmoteInUse, TmiJS } from '@/types';
import * as allThirdPartyEmotes from '@/lib/emotes';

// const thirdPartyEmoteList = ref([] as Emote[]);
const thirdPartyEmoteMap = ref(new Map() as Map<Emote['code'], Emote>);
const _escapeRegex = /[-[\]{}()*+?.,\\^$|#\s]/g;
const thirdPartyEmoteRegex = ref(/./g);

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
	return part.type !== 'text' ? part.title : undefined;
}

const props = defineProps<{
	message: Message;
}>();
// defineEmits<{
// 	(e: 'ban'): void;
// }>();
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

const parts = ref<MessagePart[]>([]);

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
	| MessagePartEmoji;

onMounted(async () => {
	const list = await allThirdPartyEmotes.load(props.message.channel.slice(1));
	thirdPartyEmoteMap.value = new Map(list.map(e => [ e.code, e ]));
	const regexAlternates = list.map(e => e.code.replace(_escapeRegex, '\\$&'))
	.sort((a, b) => b.length - a.length)
	.join('|');
	thirdPartyEmoteRegex.value = new RegExp(`(?:${regexAlternates})`, 'g');
	parts.value = parseMessageIntoParts(props.message);
});

function parseMessageIntoParts(message: Message): MessagePart[] {
	const realText = message.text.replace(/\uDB40\uDC02/g, '\u200D');
	const text: string[] = [ ...realText ];
	const parts: MessagePart[] = [ { type: 'text', content: realText } ];
	const { emotesTwitch } = message;
	const emotes = convertTwitchEmotes(emotesTwitch, realText);
	// if(message.type === 'cheer') {}
	if(emotes.length) {
		parts.splice(0);
		emotes.sort((a, b) => a.start - b.start);
		if(emotes[0].start > 0) {
			parts.push({ type: 'text', content: text.slice(0, emotes[0].start).join('') });
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
			const content = nextEmote ? text.slice(end, nextEmote.start) : text.slice(end);
			parts.push({ type: 'text', content: content.join('') });
		}
	}
	parts.reduceRight((_, n, i) => {
		if(n.type !== 'text') {
			return undefined;
		}
		const emojiList = twemoji.parse(n.content, { assetType: 'svg' });
		if(emojiList.length) {
			console.log(emojiList);
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
		}
		return undefined;
	}, undefined);
	parts.reduceRight((_, n, i) => {
		if(n.type !== 'text') {
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
		if(matches.length) {
			const newParts: MessagePart[] = [];
			const text = [ ...n.content ];
			if(matches[0].start > 0) {
				newParts.push({
					type: 'text',
					content: text.slice(0, matches[0].start).join(''),
				});
			}
			for(let i = 0; i < matches.length; i++) {
				const emote = matches[i];
				const { end, code, url, provider } = emote;
				const explicitSize: Partial<{ width: string; height: string; }> = {};
				if(emote.width !== undefined && emote.height !== undefined) {
					const scale = 24 / emote.height;
					explicitSize.width = `${emote.width * scale}px`;
					explicitSize.height = `${24}px`;
				}
				newParts.push({
					type: 'emote',
					style: {
						backgroundImage: `url(${url})`,
						...explicitSize
					},
					title: code,
					meta: { provider, zeroWidth: matches[i].isZeroWidth },
				});
				if(end === text.length) {
					continue;
				}
				const nextEmote = matches[i + 1];
				const content = nextEmote ? text.slice(end, nextEmote.start) : text.slice(end);
				newParts.push({ type: 'text', content: content.join('') });
			}
			parts.splice(i, 1, ...newParts);
		}
	}, undefined);
	// console.log(parts.reduce((p, n) => p + (n.type === 'text' ? n.content : ''), ''));
	return parts;
}

function convertTwitchEmotes(test: TmiJS.Tags.EmotesObject, text: string): EmoteInUse[] {
	const entries = Object.entries(test);
	return entries.reduce((p, [ id, indices ]) => {
		const parseEmoteIndex = (n: string) => {
			const [ start, end ] = n.split('-');
			return { start: +start, end: +end + 1 };
		};
		const first = parseEmoteIndex(indices[0]);
		const code = text.slice(first.start, first.end);
		const base = {
			code,
			id,
			provider: 'twitch',
			url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0`,
		} as const;
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
.root {
}

.part {
	display: inline;
	vertical-align: middle;

	&-text {}
	&-emote,
	&-emoji {
		display: inline-block;
		width: 24px;
		height: 24px;
		background-size: contain;
		background-repeat: no-repeat;
		background-position: center;
	}
}
</style>