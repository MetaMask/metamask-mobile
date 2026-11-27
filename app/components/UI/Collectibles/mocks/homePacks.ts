import type { HomePack } from '../types/packs';

// Placeholder packs until the real APIs are wired.
export const mockHomePacks: HomePack[] = [
  {
    code: 'lorem-1',
    name: 'Lorem ipsum',
    subtitle: 'Dolor sit amet',
    openedCount: 48210,
    priceUsd: 25,
  },
  {
    code: 'lorem-2',
    name: 'Consectetur adipiscing',
    subtitle: 'Sed do eiusmod',
    openedCount: 21500,
    priceUsd: 10,
  },
  {
    code: 'lorem-3',
    name: 'Tempor incididunt',
    subtitle: 'Ut labore et dolore',
    openedCount: 19999,
    priceUsd: 50,
  },
  {
    code: 'lorem-4',
    name: 'Magna aliqua',
    subtitle: 'Ut enim ad minim',
    openedCount: 12345,
    priceUsd: 100,
  },
  {
    code: 'lorem-5',
    name: 'Veniam quis nostrud',
    subtitle: 'Exercitation ullamco',
    openedCount: 9870,
    priceUsd: 15,
  },
  {
    code: 'lorem-6',
    name: 'Laboris nisi',
    subtitle: 'Ut aliquip ex ea',
    openedCount: 6789,
    priceUsd: 30,
  },
  {
    code: 'lorem-7',
    name: 'Commodo consequat',
    subtitle: 'Duis aute irure',
    openedCount: 4321,
    priceUsd: 20,
  },
  {
    code: 'lorem-8',
    name: 'Reprehenderit in voluptate',
    subtitle: 'Velit esse cillum',
    openedCount: 2500,
    priceUsd: 75,
  },
  {
    code: 'lorem-9',
    name: 'Fugiat nulla pariatur',
    subtitle: 'Excepteur sint',
    openedCount: 1234,
    priceUsd: 5,
  },
  {
    code: 'lorem-10',
    name: 'Occaecat cupidatat',
    subtitle: 'Non proident sunt',
    openedCount: 567,
    priceUsd: 40,
  },
];

const mockLatencyMs = 400;

export function fetchMockHomePacks() {
  return new Promise<HomePack[]>((resolve) =>
    setTimeout(() => resolve(mockHomePacks), mockLatencyMs),
  );
}
