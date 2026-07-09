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

  public audioPlayer: AudioPlayer;
  public currentResource: AudioResource | null = null;
  public connectionManager: VoiceConnectionManager;
  private adapters: Map<string, AudioSource> = new Map();
  private currentTrack: Track | null = null;
  private debugInterval: NodeJS.Timeout | null = null;

  constructor(timeoutMs: number = 30000) {
    super();
    this.connectionManager = new VoiceConnectionManager(timeoutMs);
    this.audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });

    this.audioPlayer.on('stateChange', (oldState, newState) => {
      console.log(`[DEBUG] AudioPlayer state transition: ${oldState.status} -> ${newState.status}`);
    });

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.isPlaying = false;
      if (this.currentTrack) {
        this.emit('trackEnd', this.currentTrack);
      }
      this.processQueue();
    });

    this.audioPlayer.on('error', (error) => {
      console.error(`[DEBUG] AudioPlayer Error emitted:`, error);
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
      this.queue.unshift(this.currentTrack);
    } else if (this.loopMode === LoopMode.QUEUE && this.currentTrack) {
      this.queue.push(this.currentTrack);
    }

    if (this.queue.length === 0) {
      this.currentTrack = null;
      this.emit('queueEnd');
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
      console.log(`[DEBUG] Requesting stream from adapter: ${adapter.name}`);
      const stream = await adapter.getStream(track) as any;

      console.log(`\n--- INSTRUMENTATION: Player.processQueue() ---`);
      console.log(`track:`, JSON.stringify(track));
      console.log(`adapterKey:`, track.adapterKey);
      console.log(`typeof stream:`, typeof stream);
      console.log(`stream.constructor.name:`, stream?.constructor?.name);

      if (typeof stream === 'string') {
        console.log(`string received:`, stream);
      }

      if (stream && typeof stream.on === 'function') {
        stream.on('end', () => console.log(`[INSTRUMENT] stream emitted: end`));
        stream.on('close', () => console.log(`[INSTRUMENT] stream emitted: close`));
        stream.on('error', (err: any) => console.log(`[INSTRUMENT] stream emitted: error`, err));
      }

      const oldState = this.audioPlayer.state.status;
      console.log(`AudioPlayer state before play():`, oldState);

      let oggStream;
      const ffmpegArgs = [
        '-i', typeof stream === 'string' ? stream : 'pipe:0',
        '-c:a', 'libopus',
        '-b:a', '96k',
        '-f', 'opus',
        '-ar', '48000',
        '-ac', '2',
        '-filter:a', `volume=${this.volume / 100}`,
        'pipe:1'
      ];
      
      const ffProcess = require('child_process').spawn('ffmpeg', ffmpegArgs);
      
      if (typeof stream !== 'string') {
        stream.pipe(ffProcess.stdin);
      }
      
      oggStream = ffProcess.stdout;
      
      ffProcess.stderr.on('data', (d: Buffer) => {
        // console.log(`[FFMPEG] ${d.toString().trim()}`);
      });
      ffProcess.on('error', (err: any) => console.log(`[FFMPEG ERROR]`, err));

      this.currentResource = require('@discordjs/voice').createAudioResource(oggStream, {
        inputType: require('@discordjs/voice').StreamType.OggOpus
      });

      console.log(`[DEBUG] AudioResource created.`);
      console.log(`[DEBUG] Pipeline edges configured:`, this.currentResource!.edges.map(e => e.type).join(' -> '));

      if (this.currentResource!.playStream) {
        this.currentResource!.playStream.on('error', (err: any) => console.log(`[INSTRUMENT] playStream error:`, err));
      }

      const conn = this.connectionManager.connection;
      if (conn) {
        const sub = (conn.state as any).subscription;
        console.log(`[DEBUG] VoiceConnection Subscription verification:`);
        console.log(`[DEBUG] - Subscription exists:`, !!sub);
        console.log(`[DEBUG] - Connection state:`, conn.state.status);
        if (sub) {
          console.log(`[DEBUG] - Player state from subscription:`, sub.player.state.status);
        }
      }

      this.audioPlayer.play(this.currentResource!);
      console.log(`[DEBUG] AudioPlayer.play() called.`);
      console.log(`[DEBUG] - Old state:`, oldState);
      console.log(`[DEBUG] - New state:`, this.audioPlayer.state.status);
      console.log(`[DEBUG] - resource.playbackDuration:`, this.currentResource!.playbackDuration);
      console.log(`[DEBUG] - resource.started:`, this.currentResource!.started);
      console.log(`[DEBUG] - resource.metadata:`, this.currentResource!.metadata);
      console.log(`[DEBUG] - resource.volume exists:`, !!this.currentResource!.volume);

      this.isPlaying = true;
      this.emit('trackStart', track);

      if (this.debugInterval) clearInterval(this.debugInterval);
      let ticks = 0;
      this.debugInterval = setInterval(() => {
        ticks++;
        if (ticks > 15) {
          if (this.debugInterval) clearInterval(this.debugInterval);
          return;
        }
        console.log(`[DEBUG TICK ${ticks}] AudioPlayer: ${this.audioPlayer.state.status} | Duration: ${this.currentResource?.playbackDuration}ms | Connection: ${this.connectionManager.connection?.state.status}`);
      }, 1000);

    } catch (error) {
      console.error(`[DEBUG] Exception caught during processQueue:`, error);
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
    this.audioPlayer.stop(); 
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
