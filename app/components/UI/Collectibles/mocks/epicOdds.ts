import type { EpicOddsMachine } from '../types/packs';
import { mockCatalogPacks } from './packsCatalog';

const mockEpicStats: Record<
  string,
  Pick<EpicOddsMachine, 'epicOdds' | 'pullsSinceEpic'>
> = {
  'pack-1': { epicOdds: 0.01, pullsSinceEpic: 32 },
  'pack-2': { epicOdds: 0.0275, pullsSinceEpic: 41 },
  'pack-3': { epicOdds: 0.01, pullsSinceEpic: 112 },
  'pack-4': { epicOdds: 0.02, pullsSinceEpic: 50 },
  'pack-5': { epicOdds: 0.005, pullsSinceEpic: 340 },
  'pack-6': { pullsSinceEpic: 12 },
  'pack-7': { epicOdds: 0.015, pullsSinceEpic: 20 },
  'pack-8': { epicOdds: 0.04, pullsSinceEpic: 9 },
  'pack-9': { epicOdds: 0.01, pullsSinceEpic: 150 },
  'pack-10': { epicOdds: 0.02, pullsSinceEpic: 61 },
  'pack-11': { epicOdds: 0.01, pullsSinceEpic: 400 },
  'pack-12': { epicOdds: 0.025, pullsSinceEpic: 3 },
};

export const mockEpicOddsMachines: EpicOddsMachine[] = mockCatalogPacks.map(
  (pack) => ({
    ...pack,
    isApproved: pack.code !== 'pack-12',
    ...mockEpicStats[pack.code],
  }),
);

const mockLatencyMs = 400;

export async function fetchMockEpicOddsMachines() {
  await new Promise((resolve) => setTimeout(resolve, mockLatencyMs));
  return mockEpicOddsMachines;
}
