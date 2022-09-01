<template lang="pug">
.connection {{ tmiIsConnected ? 'Connected' : 'Disconnected' }}
.chat-root
	Chat(v-for="message in messages" :key="message.id" :message="message")
</template>

<script setup lang="ts">
import Chat from './components/Chat.vue';
import type { Message } from './components/Chat.vue';
import { onMounted, onUnmounted, ref } from 'vue';
// import tmi from 'tmi.js';

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
		tmiIsConnected.value = false;
	});
	tmiClient.on('connected', () => {
		tmiIsConnected.value = true;
	});
	tmiClient.on('message', (channel, tags, text, _self) => {
		addMessage({
			type: tags['message-type'] === 'chat' ? 'chat' : 'action',
			id: tags.id,
			text,
			channel,
			userId: tags['user-id'],
			displayName: tags['display-name'],
			username: tags.username,
			// emotes: convertTwitchEmotes(tags.emotes ?? {}, text),
			emotesTwitch: tags.emotes ?? {},
			tags,
			badges: (tags['badges-raw']?.split(',') ?? []).map(badge => {
				const [ name, version ] = badge.split('/');
				return [ name, version ];
			}),
		});
	});
});
onUnmounted(() => {
	window.tmiClient?.removeAllListeners();
});
</script>

<style lang="scss"></style>