import { AudioSource, Track } from '../types';

export class JamendoAdapter implements AudioSource {
  public name = 'JamendoAdapter';
  private clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  public async getTrack(query: string): Promise<Track | Track[] | null> {
    if (/^\d+$/.test(query)) {
      return this.fetchTrackById(query);
    }
    return this.searchTrack(query);
  }

  private async fetchTrackById(id: string): Promise<Track | null> {
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${this.clientId}&format=json&id=${id}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) return null;

    const trackInfo = data.results[0];
    return {
      title: trackInfo.name,
      url: trackInfo.audio,
      duration: parseInt(trackInfo.duration, 10),
      source: 'jamendo',
      author: trackInfo.artist_name,
      thumbnail: trackInfo.image,
      adapterKey: this.name,
    };
  }

  private async searchTrack(query: string): Promise<Track | null> {
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${this.clientId}&format=json&search=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) return null;

    const trackInfo = data.results[0];
    return {
      title: trackInfo.name,
      url: trackInfo.audio,
      duration: parseInt(trackInfo.duration, 10),
      source: 'jamendo',
      author: trackInfo.artist_name,
      thumbnail: trackInfo.image,
      adapterKey: this.name,
    };
  }

  public async getStream(track: Track) {
    return track.url;
  }
}
