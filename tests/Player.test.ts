import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Player, Track, AudioSource, LoopMode } from '../src';

vi.mock('@discordjs/voice', () => ({
  createAudioPlayer: vi.fn(() => ({
    on: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    unpause: vi.fn(),
    stop: vi.fn(),
    state: { status: 'idle' }
  })),
  createAudioResource: vi.fn(() => ({
    volume: { setVolume: vi.fn() }
  })),
  NoSubscriberBehavior: { Pause: 1 },
  AudioPlayerStatus: { Idle: 'idle', Playing: 'playing', Buffering: 'buffering', AutoPaused: 'autopaused', Paused: 'paused' },
  VoiceConnectionStatus: { Ready: 'ready', Disconnected: 'disconnected', Signalling: 'signalling', Connecting: 'connecting' },
  joinVoiceChannel: vi.fn(),
  entersState: vi.fn()
}));

describe('Player', () => {
  let player: Player;
  let mockAdapter: AudioSource;

  beforeEach(() => {
    player = new Player();
    vi.spyOn(player.connectionManager, 'startAloneTimeout').mockImplementation(() => {});

    mockAdapter = {
      name: 'MockAdapter',
      getTrack: async (query) => ({ title: query, url: query, source: 'mock', adapterKey: 'MockAdapter' }),
      getStream: async (track) => track.url,
    };
    player.registerAdapter(mockAdapter);
  });

  it('should queue and play a track', async () => {
    const track = await mockAdapter.getTrack('test-song');
    await player.play(track as Track);

    expect(player.getQueue().length).toBe(0);
    expect(player.getCurrentTrack()?.title).toBe('test-song');
    expect(player.isPlaying).toBe(true);
  });

  it('should handle queueing multiple tracks', async () => {
    const track1 = await mockAdapter.getTrack('song-1') as Track;
    const track2 = await mockAdapter.getTrack('song-2') as Track;
    
    await player.play([track1, track2]);

    expect(player.getCurrentTrack()?.title).toBe('song-1');
    expect(player.getQueue().length).toBe(1);
    expect(player.getQueue()[0].title).toBe('song-2');
  });

  it('should loop a track', async () => {
    const track = await mockAdapter.getTrack('song-1') as Track;
    player.setLoopMode(LoopMode.TRACK);
    await player.play(track);
    
    (player as any).audioPlayer.state.status = 'idle';
    await (player as any).processQueue(); 

    expect(player.getCurrentTrack()?.title).toBe('song-1');
  });

  it('should loop the queue', async () => {
    const track1 = await mockAdapter.getTrack('song-1') as Track;
    const track2 = await mockAdapter.getTrack('song-2') as Track;
    
    player.setLoopMode(LoopMode.QUEUE);
    await player.play([track1, track2]);
    
    expect(player.getCurrentTrack()?.title).toBe('song-1');
    expect(player.getQueue()[0].title).toBe('song-2');

    await (player as any).processQueue(); 

    expect(player.getCurrentTrack()?.title).toBe('song-2');
    expect(player.getQueue()[0].title).toBe('song-1');
  });
});
