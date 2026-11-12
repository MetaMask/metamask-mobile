import type { ReactNode } from 'react';

export type PackRevealRarity = 'common' | 'uncommon' | 'rare' | 'epic';
export interface PackRevealProps {
  name: string;
  initiallyRevealed?: boolean;
  current?: number;
  total?: number;
  image?: string;
  backImage?: string;
  packCode?: string;
  previewImage?: string;
  year?: string;
  gradingCompany?: string;
  grade?: string;
  rarity?: PackRevealRarity;
  /** Pauses presentation when the route is not focused. */
  isActive?: boolean;
  /** Starts once a preview loads; Skip remains available if the image fails. */
  isReady?: boolean;
  /** Presentation callback only; it never purchases or signs a transaction. */
  onRevealed: () => void;
  /** Preloaded result, shown once the sequence finishes or the user skips it. */
  children?: ReactNode;
}
