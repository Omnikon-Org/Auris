import { AudioPlayer, VoiceConnection as DjsVoiceConnection } from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';

export interface Track {
  title: string;
  url: string;
  duration?: number;
  source: string;
  thumbnail?: string;
  author?: string;
  // Internal reference for the adapter to use when fetching the stream
  adapterKey: string;
}

export interface AudioSource {
  name: string;
  getTrack(query: string): Promise<Track | Track[] | null>;
  getStream(track: Track): Promise<string | import('stream').Readable>;
}

export enum LoopMode {
  OFF = 0,
  TRACK = 1,
  QUEUE = 2,
}

export interface PlayerEvents {
  trackStart: (track: Track) => void;
  trackEnd: (track: Track) => void;
  queueEnd: () => void;
  error: (error: Error) => void;
  disconnect: () => void;
}
