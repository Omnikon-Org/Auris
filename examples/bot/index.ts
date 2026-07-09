import { Client, GatewayIntentBits, Events } from 'discord.js';
import { Player, LocalFileAdapter, DirectUrlAdapter, JamendoAdapter, SoundCloudAdapter } from '../../src';
import { config } from 'dotenv';
import { registerCommands, handleInteraction } from './commands';
import { resolve } from 'path';

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('exit', (code) => {
  console.log('Process exiting with code:', code);
});

const envPath = resolve(__dirname, '.env');
config({ path: envPath });

export const localAdapter = new LocalFileAdapter();
export const directUrlAdapter = new DirectUrlAdapter();
export const jamendoAdapter = process.env.JAMENDO_CLIENT_ID ? new JamendoAdapter(process.env.JAMENDO_CLIENT_ID) : null;
export const soundCloudAdapter = process.env.SOUNDCLOUD_CLIENT_ID ? new SoundCloudAdapter(process.env.SOUNDCLOUD_CLIENT_ID) : null;

const players = new Map<string, Player>();

export const getPlayer = (guildId: string): Player => {
  if (!players.has(guildId)) {
    const player = new Player();

    player.registerAdapter(localAdapter);
    player.registerAdapter(directUrlAdapter);
    if (jamendoAdapter) player.registerAdapter(jamendoAdapter);
    if (soundCloudAdapter) player.registerAdapter(soundCloudAdapter);

    player.on('trackStart', (track) => console.log(`Started playing: ${track.title}`));
    player.on('error', (error) => console.error(`Player error in guild ${guildId}:`, error));

    players.set(guildId, player);
  }
  return players.get(guildId)!;
};

async function main() {
  console.log('Starting Auris...');
  console.log('Loading environment...');
  console.log(`Loaded .env from:\n${envPath}`);

  const hasToken = !!process.env.DISCORD_TOKEN;
  console.log(`Discord token found: ${hasToken}`);
  if (hasToken) {
    console.log(`Token length: ${process.env.DISCORD_TOKEN!.length}`);
  } else {
    console.log(`Token length: 0`);
  }

  if (process.env.JAMENDO_CLIENT_ID) {
    console.log('JAMENDO_CLIENT_ID exists');
  }
  if (process.env.SOUNDCLOUD_CLIENT_ID) {
    console.log('SOUNDCLOUD_CLIENT_ID exists');
  }

    let opusEncoder = 'None';
    try {
        require.resolve('@discordjs/opus');
        opusEncoder = '@discordjs/opus';
    } catch {
        try {
            require.resolve('opusscript');
            opusEncoder = 'opusscript';
            // Force prism-media to evaluate and load opusscript if available
            const prism = require('prism-media');
            if (prism.opus && prism.opus.Encoder) {
                new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 })._cleanup();
            }
        } catch {}
    }
    console.log(`✅ Opus Encoder: ${opusEncoder}`);

    console.log('Loaded .env successfully\n');

  if (!hasToken) {
    throw new Error('DISCORD_TOKEN is missing from .env');
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  client.once(Events.ClientReady, async (readyClient) => {
    console.log('\n🚀 Auris Example Bot\n');
    console.log('✅ Discord connected');
    console.log('✅ Local File Adapter');
    console.log('✅ Direct URL Adapter');

    if (jamendoAdapter) {
      console.log('✅ Jamendo adapter enabled');
    } else {
      console.log('⚠️ Jamendo disabled');
    }

    if (soundCloudAdapter) {
      console.log('✅ SoundCloud adapter enabled');
    } else {
      console.log('⚠️ SoundCloud disabled');
    }

    console.log('\nReady.\n');

    await registerCommands(process.env.DISCORD_TOKEN!, readyClient.user.id);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await handleInteraction(interaction);
    } catch (error) {
      console.error('Interaction error:', error);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An error occurred processing this command.', ephemeral: true }).catch(() => {});
      }
    }
  });

  client.login(process.env.DISCORD_TOKEN)
    .then(() => {
      console.log("🔐 Login request sent...");
    })
    .catch((err) => {
      console.error("❌ Discord login failed");
      console.error(err);
      process.exit(1);
    });
}

main().catch(err => {
  console.error("Fatal startup error:");
  console.error(err);
  process.exit(1);
});
