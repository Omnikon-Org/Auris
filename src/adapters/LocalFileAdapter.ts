import { AudioSource, Track } from '../types';
import { createReadStream } from 'fs';
import { resolve, basename } from 'path';

export class LocalFileAdapter implements AudioSource {
  public name = 'LocalFileAdapter';

  public async getTrack(query: string): Promise<Track | null> {
    const absolutePath = resolve(query);
    return {
      title: basename(absolutePath),
      url: absolutePath,
      source: 'local',
      adapterKey: this.name,
    };
  }

  public async getStream(track: Track) {
    return createReadStream(track.url);
  }
}
