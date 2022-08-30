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
const messages = ref<Message[]>([
	// {
	// 	channel: '#avesmhl',
	// 	displayName: 'Alca',
	// 	emotesTwitch: {},
	// 	id: '124',
	// 	text: '🌠 POGGIES 🌠 POGGIES 🌠 POGGIES 🌠 POGGIES',
	// 	type: 'chat',
	// 	userId: '7676884',
	// 	username: 'alca',
	// }
	// {
	// 	channel: '#alca',
	// 	displayName: 'Alca',
	// 	emotesTwitch: {
	// 		'25': [
	// 			'4-8',
	// 			'12-16',
	// 			'27-31'
	// 		],
	// 		'328626': [
	// 			'18-25'
	// 		]
	// 	},
	// 	id: '123',
	// 	text: '123 Kappa 🌟 Kappa alcaFace Kappa 456 YooHoo ForeverAlone RainTime',
	// 	type: 'chat',
	// 	userId: '7676884',
	// 	username: 'alca',
	// }
]);
/*
{
	"badge-info": {
		"subscriber": "62"
	},
	"badges": {
		"broadcaster": "1",
		"subscriber": "3012",
		"turbo": "1"
	},
	"client-nonce": "b7cb90696d2bd75061f568ec08372534",
	"color": "#177DE3",
	"display-name": "Alca",
	"emotes": {
		"25": [
			"4-8",
			"12-16",
			"27-31"
		],
		"328626": [
			"18-25"
		]
	},
	"first-msg": false,
	"flags": null,
	"id": "16030dc3-4f43-4eae-9fd9-fab2bceed4a1",
	"mod": false,
	"returning-chatter": false,
	"room-id": "7676884",
	"subscriber": true,
	"tmi-sent-ts": "1661835840291",
	"turbo": true,
	"user-id": "7676884",
	"user-type": null,
	"emotes-raw": "25:4-8,12-16,27-31/328626:18-25",
	"badge-info-raw": "subscriber/62",
	"badges-raw": "broadcaster/1,subscriber/3012,turbo/1",
	"username": "alca",
	"message-type": "chat"
}
*/
function addMessage(message: Message) {
	if(messages.value.length > 3) {
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
				debug: true,
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
			type: 'chat',
			id: tags.id,
			text,
			channel,
			userId: tags['user-id'],
			displayName: tags['display-name'],
			username: tags.username,
			// emotes: convertTwitchEmotes(tags.emotes ?? {}, text),
			emotesTwitch: tags.emotes ?? {},
		});
	});
});
onUnmounted(() => {
	window.tmiClient?.removeAllListeners();
});
</script>

<style lang="scss"></style>