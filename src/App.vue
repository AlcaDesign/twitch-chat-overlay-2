<template lang="pug">
//- .connection {{ tmiIsConnected ? 'Connected' : 'Disconnected' }}
.chat-root
	TransitionGroup(name="chat-messages")
		Chat(v-for="message in messages" :key="message.id" :message="message")
</template>

<script setup lang="ts">
import type { TmiJS } from './types';
import Chat from './components/Chat.vue';
import type { Message } from './components/Chat.vue';
import { onMounted, onUnmounted, ref } from 'vue';
import * as allThirdPartyEmotes from '@/lib/emotes';
import * as twitchBadges from '@/lib/badges';
import * as twitchCheermotes from '@/lib/cheermotes';
import { ColorAdjuster } from '@/lib/ffz-color';
// import tmi from 'tmi.js';

const adjuster = new ColorAdjuster('#141414', 1, 3.25);

const tmiIsConnected = ref(false);
const messages = ref<Message[]>([]);
function addMessage(message: Message) {
	if(messages.value.length > 15) {
		messages.value.shift();
	}
	messages.value.push(message);
}
onMounted(() => {
	if('tmiClient' in window === false) {
		const qs = new URLSearchParams(window.location.search);
		const channels = qs.getAll('channel');
		if(!channels.length) {
			channels.push('alca');
		}
		window.tmiClient = new tmi.Client({
			options: {
				debug: qs.get('debug') === 'true',
				skipMembership: true,
			},
			channels,
		});
		tmiClient.connect();
	}
	tmiIsConnected.value = tmiClient._isConnected();
	tmiClient.on('disconnected', () => {
		console.log('Disconnected from Twitch');
		tmiIsConnected.value = false;
	});
	tmiClient.on('connected', () => {
		console.log('Connected to Twitch');
		tmiIsConnected.value = true;
	});
	tmiClient.on('join', async (channel, _username, self) => {
		if(!self) {
			return;
		}
		console.log('Joined channel', channel);
		const chan = channel.slice(1);
		try {
			await Promise.all([
				allThirdPartyEmotes.load(chan),
				twitchBadges.load(chan),
				twitchCheermotes.load(chan),
			]);
		} catch(e) {
			console.error(e);
		}
	});
	const onMessage: (...args: TmiJS.Events['message'] | TmiJS.Events['cheer'] | TmiJS.Events['announcement']) => void = (channel, tags, text, _self?: boolean, _color?: string) => {
		addMessage({
			type: tags['message-type'],
			id: tags.id,
			text,
			channel,
			userId: tags['user-id'],
			displayName: tags['display-name'],
			username: 'username' in tags ? tags.username : tags.login,
			// emotes: convertTwitchEmotes(tags.emotes ?? {}, text),
			emotesTwitch: tags.emotes ?? {},
			tags: {
				...tags,
				color: (adjuster.process(tags.color) ?? (tags.color || '')) as string,
			},
			badges: (tags['badges-raw']?.split(',') ?? []).map(badge => {
				const [ name, version ] = badge.split('/');
				return [ name, version ];
			}),
		});
	};
	tmiClient.on('message', onMessage);
	tmiClient.on('cheer', onMessage);
	tmiClient.on('announcement', onMessage);
	tmiClient.on('clearchat', channel => {
		const arr = messages.value;
		for(let i = arr.length - 1; i >= 0; i--) {
			const n = arr[i];
			if(n.channel === channel) {
				arr.splice(i, 1);
			}
		}
	});
	tmiClient.on('ban', (channel, username, _, tags) => {
		const arr = messages.value;
		for(let i = arr.length - 1; i >= 0; i--) {
			const n = arr[i];
			if(n.channel === channel && n.tags['user-id'] === tags['target-user-id']) {
				arr.splice(i, 1);
			}
		}
	});
	tmiClient.on('timeout', (channel, username, _, duration, tags) => {
		const arr = messages.value;
		for(let i = arr.length - 1; i >= 0; i--) {
			const n = arr[i];
			if(n.channel === channel && n.tags['user-id'] === tags['target-user-id']) {
				arr.splice(i, 1);
			}
		}
	});
	tmiClient.on('messagedeleted', (channel, username, deletedMessage, tags) => {
		const arr = messages.value;
		for(let i = arr.length - 1; i >= 0; i--) {
			const n = arr[i];
			if(n.channel === channel && n.id === tags['target-msg-id']) {
				arr.splice(i, 1);
				break;
			}
		}
	});
});
onUnmounted(() => window.tmiClient?.removeAllListeners());
</script>

<style lang="scss">
@use '@/assets/main';

body {
	background: hsl(0, 0%, 8%);
	color: hsl(0, 0%, 100%);
}
.chat-root {
	position: fixed;
	bottom: 0.2rem;
	right: 0.2rem;
	left: 0.2rem;
}
.chat-messages {
	&-enter-active,
	&-leave-active {
		overflow: hidden;
		transition:
			opacity 120ms ease-out,
			transform 240ms ease-out;
	}
	&-enter-from {
		opacity: 0;
		transform: translateX(100px);
	}
	&-enter-to {
	}
	&-leave-to {
		opacity: 0;
	}
}
</style>