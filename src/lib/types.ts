export interface TrackDTO {
  slug: string;
  title: string;
  bpm: number;
  durationSec: number;
  genres: string[];
  tags: string[];
  artworkUrl: string;
  audioUrl: string;
  free: boolean;
  featured: boolean;
}

export interface LicenseDTO {
  slug: string;
  name: string;
  priceCents: number;
  exclusive: boolean;
  popular: boolean;
  files: string[];
  terms: string[];
}

export interface SoundKitDTO {
  slug: string;
  title: string;
  description: string;
  priceCents: number;
  artworkUrl: string;
}

export interface ServiceDTO {
  slug: string;
  title: string;
  description: string;
  turnaround: string;
  needs: string;
  priceCents: number;
  imageUrl: string;
}
