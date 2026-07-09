import { AudioSource, Track } from '../types';

export class DirectUrlAdapter implements AudioSource {
  public name = 'DirectUrlAdapter';

  public async getTrack(query: string): Promise<Track | null> {
    if (!query.startsWith('http://') && !query.startsWith('https://')) {
      return null;
    }
    
    return {
      title: query.split('/').pop() || 'Unknown Direct Audio',
      url: query,
      source: 'direct',
      adapterKey: this.name,
    };
  }

  public async getStream(track: Track) {
    return track.url;
  }
}
