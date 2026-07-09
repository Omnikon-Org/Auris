import { 
  joinVoiceChannel, 
  VoiceConnection, 
  VoiceConnectionStatus, 
  entersState,
  AudioPlayer
} from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';

export class VoiceConnectionManager {
  public connection: VoiceConnection | null = null;
  public channelId: string | null = null;
  public guildId: string | null = null;

  private timeoutId: NodeJS.Timeout | null = null;
  private readonly timeoutMs: number;

  constructor(timeoutMs: number = 30000) {
    this.timeoutMs = timeoutMs;
  }

  public async connect(channel: VoiceBasedChannel): Promise<VoiceConnection> {
    if (this.connection && this.channelId === channel.id) {
      return this.connection;
    }

    console.log(`[DEBUG] Joining Voice Channel: ${channel.id}`);
    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator as any,
      selfMute: false,
      selfDeaf: true,
    });

    this.channelId = channel.id;
    this.guildId = channel.guild.id;

    this.connection.on('stateChange', (oldState, newState) => {
      console.log(`[DEBUG] VoiceConnection State Transition: ${oldState.status} -> ${newState.status}`);
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
      console.log(`[DEBUG] VoiceConnection reached Ready.`);
    } catch (error) {
      console.error(`[DEBUG] VoiceConnection failed to reach Ready state:`, error);
      this.connection.destroy();
      this.connection = null;
      throw new Error('Failed to connect to voice channel.');
    }

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.log(`[DEBUG] VoiceConnection Disconnected.`);
      try {
        await Promise.race([
          entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        console.log(`[DEBUG] VoiceConnection attempting reconnect...`);
      } catch (error) {
        console.log(`[DEBUG] VoiceConnection permanently disconnected.`);
        this.destroy();
      }
    });

    return this.connection;
  }

  public subscribe(player: AudioPlayer) {
    if (this.connection) {
      console.log(`[DEBUG] Subscribing AudioPlayer to VoiceConnection...`);
      this.connection.subscribe(player);
    } else {
      console.log(`[DEBUG] Cannot subscribe - no VoiceConnection exists!`);
    }
  }

  public destroy() {
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
    this.channelId = null;
    this.guildId = null;
    this.stopAloneTimeout();
  }

  public startAloneTimeout(onTimeout: () => void) {
    if (this.timeoutId) return;
    this.timeoutId = setTimeout(() => {
      onTimeout();
      this.destroy();
    }, this.timeoutMs);
  }

  public stopAloneTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
