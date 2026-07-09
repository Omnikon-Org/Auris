<div align="center">
  <h1>discord-legal-music</h1>
  <p><strong>A self-hosted, legally-clean music bot library for discord.js.</strong></p>
  <p><i>Code. Create. Conquer. — Brought to you by Omnikon</i></p>

  <p>
    <a href="https://github.com/Omnikon/discord-legal-music/actions"><img src="https://img.shields.io/github/actions/workflow/status/Omnikon/discord-legal-music/test.yml?branch=main" alt="Build Status" /></a>
    <a href="https://www.npmjs.com/package/discord-legal-music"><img src="https://img.shields.io/npm/v/discord-legal-music.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/discord-legal-music"><img src="https://img.shields.io/npm/dt/discord-legal-music.svg" alt="npm downloads" /></a>
    <a href="https://github.com/Omnikon/discord-legal-music/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/discord-legal-music.svg" alt="License" /></a>
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue.svg" alt="TypeScript Ready" />
  </p>
</div>

---

## 🛑 The Problem: Why not YouTube?

Most Discord music bots scrape YouTube audio, violating YouTube's Terms of Service. This gets bots DMCA'd, IP-blocked, or banned completely. Existing alternatives are either abandoned or rely on fragile scraper libraries like `ytdl-core`.

**`discord-legal-music`** solves this by providing a robust, legal-only audio pipeline. Built from the ground up without YouTube scraping, this library guarantees peace of mind while delivering a high-quality, feature-rich audio experience for your users.

---

## ✨ Features

- 🎵 **Legally Safe Audio Sources**: Native support for safe, authorized streaming.
  - **Local Files**: Play MP3, OGG, WAV, and FLAC directly from your server.
  - **Direct URLs**: Stream from any directly hosted audio file.
  - **Jamendo API**: Access thousands of royalty-free / Creative Commons tracks.
  - **SoundCloud API**: Stream officially permitted tracks from SoundCloud.
- 🔌 **BYO Adapter System**: Easily integrate your own licensed catalog or corporate library using our simple 2-method interface.
- 🔁 **Robust Playback Engine**: Complete queue management with Loop (Track/Queue), Skip, Pause/Resume, and granular Volume control.
- ⚙️ **Smart Voice Management**: Automatically reconnects on network drops and gracefully disconnects when inactive or alone.
- ⚡ **Modern Architecture**: Written in strict TypeScript, exporting both ESM and CommonJS for seamless integration in any Node environment.

---

## 🛠 Installation

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher.
- **FFmpeg**: *Required for audio processing.*
  - **Ubuntu/Debian:** `sudo apt install ffmpeg`
  - **MacOS:** `brew install ffmpeg`
  - **Windows:** Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH.

### 2. Install Package
```bash
npm install discord-legal-music discord.js @discordjs/voice libsodium-wrappers
```

---

## 🚀 Quickstart (Under 10 Lines)

Integrate music into your existing `discord.js` bot instantly:

```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import { Player, LocalFileAdapter } from 'discord-legal-music';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const player = new Player();
const localAdapter = new LocalFileAdapter();

player.registerAdapter(localAdapter);

// Inside your command execution block:
await player.connect(interaction.member.voice.channel);
const track = await localAdapter.getTrack('./assets/music/track.mp3');
await player.play(track);
```

---

## 🔌 Supported Adapters

| Adapter | Description | Setup |
|---------|-------------|-------|
| **LocalFileAdapter** | Plays audio from your local filesystem. | `new LocalFileAdapter()` |
| **DirectUrlAdapter** | Streams audio directly from an HTTP URL. | `new DirectUrlAdapter()` |
| **JamendoAdapter** | Searches and streams from Jamendo API. | `new JamendoAdapter('YOUR_CLIENT_ID')` |
| **SoundCloudAdapter** | Streams permitted tracks from SoundCloud. | `new SoundCloudAdapter('YOUR_CLIENT_ID')` |

---

## 📖 API Reference

### `Player` Class
The core queue and playback manager.

#### Connection & Playback
- **`connect(channel: VoiceBasedChannel)`**: Joins the voice channel and prepares playback.
- **`disconnect()`**: Gracefully leaves the voice channel and flushes the queue.
- **`play(track: Track | Track[])`**: Appends track(s) to the queue and starts playing if idle.
- **`pause()` / `resume()`**: Toggles playback state.
- **`skip()`**: Skips the currently playing track.
- **`stop()`**: Halts playback entirely and clears the queue.

#### Controls
- **`setVolume(level: number)`**: Adjusts the volume between `0` and `200`.
- **`setLoopMode(mode: LoopMode)`**: Sets looping behavior.
  - `LoopMode.OFF`
  - `LoopMode.TRACK`
  - `LoopMode.QUEUE`

#### State & Events
- **`getQueue(): Track[]`**: Returns the pending tracks.
- **`getCurrentTrack(): Track | null`**: Returns the active track.

The `Player` emits standard events you can hook into for logging or sending Discord embeds:
```typescript
player.on('trackStart', (track) => console.log(`Now playing: ${track.title}`));
player.on('trackEnd', (track) => console.log(`Finished: ${track.title}`));
player.on('queueEnd', () => console.log(`Queue empty!`));
```

---

## 🧑‍💻 Running the Example Bot

We've provided a fully functioning Discord bot showcasing all slash commands (`/play`, `/pause`, `/skip`, `/loop`, `/queue`, `/volume`).

1. Clone the repository.
2. Run `npm install`.
3. Copy `examples/bot/.env.example` to `examples/bot/.env` and add your **Discord Bot Token**.
4. Start the bot:
   ```bash
   npm run dev:example
   ```
5. Invite the bot to your server and type `/play` in any channel!

---

<div align="center">
  <p><strong>Part of the Omnikon Ecosystem</strong></p>
  <p>
    <a href="https://github.com/Omnikon/schema-cast">schema-cast</a> • 
    <a href="https://github.com/Omnikon/PackVault">PackVault</a> • 
    <a href="https://github.com/Omnikon/IssueSwipe">IssueSwipe</a> • 
    <a href="https://github.com/Omnikon/Abyss">Abyss</a>
  </p>
</div>
