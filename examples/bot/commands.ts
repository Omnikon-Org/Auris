import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  GuildMember
} from 'discord.js';
import { getPlayer, localAdapter, jamendoAdapter } from './index';
import { LoopMode } from '../../src';

const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays a song from a legal source')
    .addStringOption(option => 
      option.setName('query')
        .setDescription('The file path, direct URL, or Jamendo search query')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('source')
        .setDescription('The source to play from')
        .setRequired(true)
        .addChoices(
          { name: 'Local File', value: 'LocalFileAdapter' },
          { name: 'Jamendo', value: 'JamendoAdapter' }
        )),
  new SlashCommandBuilder().setName('pause').setDescription('Pause the current track'),
  new SlashCommandBuilder().setName('resume').setDescription('Resume the current track'),
  new SlashCommandBuilder().setName('skip').setDescription('Skip the current track'),
  new SlashCommandBuilder().setName('queue').setDescription('Show the current queue'),
  new SlashCommandBuilder().setName('leave').setDescription('Leave the voice channel'),
  new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the loop mode')
    .addIntegerOption(option => 
      option.setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: LoopMode.OFF },
          { name: 'Track', value: LoopMode.TRACK },
          { name: 'Queue', value: LoopMode.QUEUE },
        )),
  new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the volume (0-200)')
    .addIntegerOption(option => 
      option.setName('level')
        .setDescription('Volume level')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(200)),
];

export async function registerCommands(token: string, clientId: string) {
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands.map(c => c.toJSON()) },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

export async function handleInteraction(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice?.channel;
  
  if (!voiceChannel) {
    return interaction.reply({ content: 'You must be in a voice channel to use music commands.', ephemeral: true });
  }

  const player = getPlayer(interaction.guildId!);

  switch (interaction.commandName) {
    case 'play': {
      await interaction.deferReply();
      const query = interaction.options.getString('query', true);
      const source = interaction.options.getString('source', true);
      
      try {
        await player.connect(voiceChannel);
      } catch (error) {
        return interaction.editReply('Failed to connect to the voice channel.');
      }

      let track;
      if (source === 'LocalFileAdapter') {
        track = await localAdapter.getTrack(query);
      } else if (source === 'JamendoAdapter') {
        if (!jamendoAdapter) return interaction.editReply('Jamendo adapter is not configured.');
        track = await jamendoAdapter.getTrack(query);
      }

      if (!track) {
        return interaction.editReply('Track not found.');
      }

      await player.play(track);
      
      const title = Array.isArray(track) ? `${track.length} tracks` : track.title;
      return interaction.editReply(`Queued: **${title}**`);
    }
    
    case 'pause': {
      player.pause();
      return interaction.reply('Paused playback.');
    }

    case 'resume': {
      player.resume();
      return interaction.reply('Resumed playback.');
    }

    case 'skip': {
      player.skip();
      return interaction.reply('Skipped to the next track.');
    }

    case 'queue': {
      const queue = player.getQueue();
      const current = player.getCurrentTrack();
      
      if (!current && queue.length === 0) {
        return interaction.reply('The queue is empty.');
      }

      const qString = queue.slice(0, 10).map((t, i) => `${i + 1}. ${t.title}`).join('\n');
      return interaction.reply(`**Now Playing:** ${current?.title || 'None'}\n\n**Queue:**\n${qString || 'No more tracks in queue.'}`);
    }

    case 'loop': {
      const mode = interaction.options.getInteger('mode', true) as LoopMode;
      player.setLoopMode(mode);
      return interaction.reply(`Loop mode set to: ${LoopMode[mode]}`);
    }

    case 'volume': {
      const level = interaction.options.getInteger('level', true);
      player.setVolume(level);
      return interaction.reply(`Volume set to ${level}%.`);
    }

    case 'leave': {
      player.disconnect();
      return interaction.reply('Left the voice channel and cleared the queue.');
    }

    default:
      return interaction.reply({ content: 'Unknown command.', ephemeral: true });
  }
}
