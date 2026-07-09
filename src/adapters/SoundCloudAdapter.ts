import { AudioSource, Track } from '../types';

export class SoundCloudAdapter implements AudioSource {
  public name = 'SoundCloudAdapter';
  private clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  public async getTrack(query: string): Promise<Track | null> {
    let url = query;
    if (query.includes('soundcloud.com')) {
      const resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(query)}&client_id=${this.clientId}`;
      try {
        const res = await fetch(resolveUrl);
        const data = await res.json();
        
        if (data && data.kind === 'track') {
          return this.mapTrack(data);
        }
      } catch (e) {
        return null;
      }
    } else {
      const searchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${this.clientId}&limit=1`;
      try {
        const res = await fetch(searchUrl);
        const data = await res.json();
        
        if (data.collection && data.collection.length > 0) {
          return this.mapTrack(data.collection[0]);
        }
      } catch (e) {
        return null;
      }
    }

    return null;
  }

  private mapTrack(data: any): Track {
    let streamUrl = '';
    
    if (data.media && data.media.transcodings) {
      const transcoding = data.media.transcodings.find((t: any) => t.format.protocol === 'progressive') 
        || data.media.transcodings[0];
      if (transcoding) {
        streamUrl = transcoding.url;
      }
    }

    return {
      title: data.title,
      url: streamUrl, 
      duration: Math.floor(data.duration / 1000),
      source: 'soundcloud',
      author: data.user?.username,
      thumbnail: data.artwork_url,
      adapterKey: this.name,
    };
  }

  public async getStream(track: Track) {
    if (track.url.includes('api-v2.soundcloud.com')) {
      const res = await fetch(`${track.url}?client_id=${this.clientId}`);
      const data = await res.json();
      return data.url;
    }
    return track.url;
  }
}
