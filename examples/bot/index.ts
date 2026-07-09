import { Client, GatewayIntentBits, Events } from 'discord.js';
import { Player, LocalFileAdapter, JamendoAdapter } from '../../src';
import { config } from 'dotenv';
import { registerCommands, handleInteraction } from './commands';

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

export const localAdapter = new LocalFileAdapter();
export const jamendoAdapter = process.env.JAMENDO_CLIENT_ID ? new JamendoAdapter(process.env.JAMENDO_CLIENT_ID) : null;

const players = new Map<string, Player>();

export const getPlayer = (guildId: string): Player => {
  if (!players.has(guildId)) {
    const player = new Player();
    
    player.registerAdapter(localAdapter);
    if (jamendoAdapter) player.registerAdapter(jamendoAdapter);

    // Setup event listeners for the player
    player.on('trackStart', (track) => console.log(`Started playing: ${track.title}`));
    player.on('error', (error) => console.error(`Player error in guild ${guildId}:`, error));
    
    players.set(guildId, player);
  }
  return players.get(guildId)!;
};

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot logged in as ${readyClient.user.tag}`);
  await registerCommands(process.env.DISCORD_TOKEN!, readyClient.user.id);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await handleInteraction(interaction);
});

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is not set in .env');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
