# youtube-websocket

A Cloudflare Worker for proxying YouTube Live Chat over WebSockets.

## Usage

If you have a channel ID, (*i.e. `"LudwigAhgren"` or `"UCRAEUAmW9kletIzOxhpLRFw"`*):

- `wss://your-worker-endpoint.workers.dev/c/:channelId`

If you have a video ID, (*i.e. `"dAiqTo3N8MU"`*):

- `wss://your-worker-endpoint.workers.dev/s/:videoId`

Once connected, you will receive JSON encoded messages for each chat event, with the following type definition:

```typescript
type ChatEvent = {
	type: 'message';
	id: string; // Chat message ID
	message: string; // Chat message text
	author: {
		name: string; // Author YouTube channel name
		id: string; // Author YouTube channel ID
		badges: {
			tooltip: string; // The tooltip shown when hovering over the badge
			type: 'icon' | 'custom';
			// When type === 'icon', this is the name of the badge icon.
			// When type === 'custom', this is the URL of the badge image.
			badge: string;
		}[];
	};
	unix: number; // The unix timestamp of the message
};
```
