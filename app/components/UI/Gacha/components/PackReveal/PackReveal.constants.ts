import { brandColor } from '@metamask/design-tokens';
import {
  ImpactMoment,
  type HapticImpactMoment,
} from '../../../../../util/haptics';
import type { PackRevealRarity } from './PackReveal.types';

export const REVEAL_DURATION = 6800;
export const CUT_COMPLETION = 0.9;
export const CUT_STEPS = 32;
export const MIN_IMPACT_INTERVAL = 35;
export const MAX_IMPACT_LATENCY = 120;

/** Pulse offsets in milliseconds follow the seam burst and successive spark waves. */
export const REVEAL_PROFILES = {
  common: {
    color: brandColor.grey100,
    particles: 18,
    impact: ImpactMoment.GachaRevealCommon,
    crackle: [680, 820, 980, 1160, 1370, 1600, 2240, 2420],
  },
  uncommon: {
    color: brandColor.blue300,
    particles: 24,
    impact: ImpactMoment.GachaRevealUncommon,
    crackle: [
      680, 780, 900, 990, 1110, 1260, 1410, 1600, 1900, 2020, 2250, 2420,
    ],
  },
  rare: {
    color: brandColor.purple300,
    particles: 32,
    impact: ImpactMoment.GachaRevealRare,
    crackle: [
      680, 760, 840, 930, 1020, 1100, 1200, 1300, 1400, 1500, 1640, 1740, 1910,
      2010, 2130, 2270, 2380, 2520,
    ],
  },
  epic: {
    color: brandColor.yellow100,
    particles: 40,
    impact: ImpactMoment.GachaRevealEpic,
    crackle: [
      680, 740, 800, 870, 940, 1000, 1060, 1130, 1200, 1270, 1340, 1410, 1500,
      1570, 1640, 1710, 1820, 1890, 1960, 2070, 2140, 2220, 2350, 2430, 2540,
      2660,
    ],
  },
} satisfies Record<
  PackRevealRarity,
  {
    color: string;
    particles: number;
    impact: HapticImpactMoment;
    crackle: number[];
  }
>;
