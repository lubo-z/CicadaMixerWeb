import type {Cicada} from "./types";

export interface MixResult {
  applied: boolean;
  cancelled: boolean;
  playing: Cicada[];
  failed: Cicada[];
}

interface Track {
  cicada: Cicada;
  audio: HTMLAudioElement;
}

export class AudioMixer {
  private tracks: Track[] = [];
  private generation = 0;

  async replace(cicadas: Cicada[]): Promise<MixResult> {
    const generation = ++this.generation;
    if (cicadas.length === 0) {
      this.stopTracks(this.tracks);
      this.tracks = [];
      return {applied: true, cancelled: false, playing: [], failed: []};
    }

    const candidates = cicadas.map((cicada) => {
      const audio = new Audio(cicada.media.url);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;
      return {cicada, audio};
    });

    const results = await Promise.allSettled(
      candidates.map(({audio}) => audio.play()),
    );

    if (generation !== this.generation) {
      this.stopTracks(candidates);
      return {applied: false, cancelled: true, playing: [], failed: []};
    }

    const successful: Track[] = [];
    const failed: Cicada[] = [];
    results.forEach((result, index) => {
      const track = candidates[index];
      if (result.status === "fulfilled") {
        track.audio.volume = Math.max(
          0,
          Math.min(1, track.cicada.defaultGain),
        );
        successful.push(track);
      } else {
        track.audio.pause();
        track.audio.src = "";
        failed.push(track.cicada);
      }
    });

    if (successful.length === 0) {
      this.stopTracks(candidates);
      return {
        applied: false,
        cancelled: false,
        playing: this.tracks.map(({cicada}) => cicada),
        failed,
      };
    }

    this.stopTracks(this.tracks);
    this.tracks = successful;
    return {
      applied: true,
      cancelled: false,
      playing: successful.map(({cicada}) => cicada),
      failed,
    };
  }

  stop(): void {
    this.generation += 1;
    this.stopTracks(this.tracks);
    this.tracks = [];
  }

  private stopTracks(tracks: Track[]): void {
    tracks.forEach(({audio}) => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    });
  }
}
