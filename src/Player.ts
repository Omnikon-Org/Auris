import { 
  AudioPlayer, 
  AudioPlayerStatus, 
  createAudioPlayer, 
  createAudioResource, 
  NoSubscriberBehavior, 
  AudioResource 
} from '@discordjs/voice';
import { EventEmitter } from 'events';
import { VoiceBasedChannel } from 'discord.js';
import { Track, LoopMode, PlayerEvents, AudioSource } from './types';
import { VoiceConnectionManager } from './VoiceConnectionManager';

export class Player extends EventEmitter {
  public queue: Track[] = [];
  public loopMode: LoopMode = LoopMode.OFF;
  public volume: number = 100;
  public isPlaying: boolean = false;
  
  private audioPlayer: AudioPlayer;
  private currentResource: AudioResource | null = null;
  public connectionManager: VoiceConnectionManager;
  private adapters: Map<string, AudioSource> = new Map();
  private currentTrack: Track | null = null;

  constructor(timeoutMs: number = 30000) {
    super();
    this.connectionManager = new VoiceConnectionManager(timeoutMs);
    this.audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.isPlaying = false;
      if (this.currentTrack) {
        this.emit('trackEnd', this.currentTrack);
      }
      this.processQueue();
    });

    this.audioPlayer.on('error', (error) => {
      this.emit('error', error);
      this.processQueue(); // skip to next on error
    });
  }

  public registerAdapter(adapter: AudioSource) {
    this.adapters.set(adapter.name, adapter);
  }

  public async connect(channel: VoiceBasedChannel) {
    await this.connectionManager.connect(channel);
    this.connectionManager.subscribe(this.audioPlayer);
  }

  public disconnect() {
    this.connectionManager.destroy();
    this.audioPlayer.stop();
    this.queue = [];
    this.currentTrack = null;
    this.isPlaying = false;
    this.emit('disconnect');
  }

  public async play(trackOrTracks: Track | Track[]) {
    const tracks = Array.isArray(trackOrTracks) ? trackOrTracks : [trackOrTracks];
    this.queue.push(...tracks);

    if (!this.isPlaying && this.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.loopMode === LoopMode.TRACK && this.currentTrack) {
      // Re-insert at the beginning
      this.queue.unshift(this.currentTrack);
    } else if (this.loopMode === LoopMode.QUEUE && this.currentTrack) {
      // Push to the end
      this.queue.push(this.currentTrack);
    }

    if (this.queue.length === 0) {
      this.currentTrack = null;
      this.emit('queueEnd');
      // Start timeout for alone in channel if queue is empty
      this.connectionManager.startAloneTimeout(() => this.disconnect());
      return;
    }

    this.connectionManager.stopAloneTimeout();

    const track = this.queue.shift()!;
    this.currentTrack = track;

    const adapter = this.adapters.get(track.adapterKey);
    if (!adapter) {
      this.emit('error', new Error(`Adapter ${track.adapterKey} not found.`));
      return this.processQueue();
    }

    try {
      const stream = await adapter.getStream(track);
      
      this.currentResource = createAudioResource(stream as any, {
        inlineVolume: true,
      });
      
      if (this.currentResource.volume) {
        this.currentResource.volume.setVolume(this.volume / 100);
      }

      this.audioPlayer.play(this.currentResource);
      this.isPlaying = true;
      this.emit('trackStart', track);
    } catch (error) {
      this.emit('error', error as Error);
      this.processQueue();
    }
  }

  public pause() {
    this.audioPlayer.pause();
    this.isPlaying = false;
  }

  public resume() {
    this.audioPlayer.unpause();
    this.isPlaying = true;
  }

  public skip() {
    this.audioPlayer.stop(); // This triggers AudioPlayerStatus.Idle, which calls processQueue
  }

  public stop() {
    this.queue = [];
    this.loopMode = LoopMode.OFF;
    this.audioPlayer.stop();
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(200, volume));
    if (this.currentResource?.volume) {
      this.currentResource.volume.setVolume(this.volume / 100);
    }
  }

  public setLoopMode(mode: LoopMode) {
    this.loopMode = mode;
  }

  public getQueue(): Track[] {
    return this.queue;
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }
}

// Override EventEmitter methods for types
export interface Player {
  on<K extends keyof PlayerEvents>(event: K, listener: PlayerEvents[K]): this;
  once<K extends keyof PlayerEvents>(event: K, listener: PlayerEvents[K]): this;
  emit<K extends keyof PlayerEvents>(event: K, ...args: Parameters<PlayerEvents[K]>): boolean;
}
