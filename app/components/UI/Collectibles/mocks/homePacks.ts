import type { HomePack } from '../types/packs';

// Placeholder packs until the real APIs are wired.
export const mockHomePacks: HomePack[] = [
  {
    code: 'lorem-1',
    name: 'Lorem ipsum',
    subtitle: 'Dolor sit amet',
    counterLabel: '12,345',
    priceLabel: '$25',
  },
  {
    code: 'lorem-2',
    name: 'Consectetur adipiscing',
    subtitle: 'Sed do eiusmod',
    counterLabel: '6,789',
    priceLabel: '$10',
  },
  {
    code: 'lorem-3',
    name: 'Tempor incididunt',
    subtitle: 'Ut labore et dolore',
    counterLabel: '1,234',
    priceLabel: '$50',
  },
  {
    code: 'lorem-4',
    name: 'Magna aliqua',
    subtitle: 'Ut enim ad minim',
    counterLabel: '567',
    priceLabel: '$100',
  },
];

const mockLatencyMs = 400;

export function fetchMockHomePacks() {
  return new Promise<HomePack[]>((resolve) =>
    setTimeout(() => resolve(mockHomePacks), mockLatencyMs),
  );
}
