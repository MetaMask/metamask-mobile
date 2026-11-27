import type { CatalogPack, PackCategoryMapping } from '../types/packs';

export const mockCatalogPacks: CatalogPack[] = [
  {
    code: 'pack-1',
    name: 'Lorem ipsum',
    openedCount: 48210,
    priceUsd: 25,
    isMachineOpen: true,
  },
  {
    code: 'pack-2',
    name: 'Consectetur adipiscing',
    openedCount: 21500,
    priceUsd: 25,
    isMachineOpen: true,
  },
  {
    code: 'pack-3',
    name: 'Tempor incididunt',
    openedCount: 19999,
    priceUsd: 50,
    isMachineOpen: true,
  },
  {
    code: 'pack-4',
    name: 'Magna aliqua',
    openedCount: 12345,
    priceUsd: 10,
    isMachineOpen: true,
  },
  {
    code: 'pack-5',
    name: 'Veniam quis nostrud',
    openedCount: 9870,
    priceUsd: 100,
    isMachineOpen: true,
  },
  {
    code: 'pack-6',
    name: 'Laboris nisi',
    openedCount: 6789,
    priceUsd: 15,
    isMachineOpen: true,
  },
  {
    code: 'pack-7',
    name: 'Reprehenderit in voluptate velit esse cillum dolore',
    openedCount: 4321,
    priceUsd: 50,
    isMachineOpen: true,
  },
  {
    code: 'pack-8',
    name: 'Fugiat nulla pariatur',
    openedCount: 2500,
    priceUsd: 5,
    isMachineOpen: true,
  },
  {
    code: 'pack-9',
    name: 'Occaecat cupidatat',
    openedCount: 1234,
    priceUsd: 75,
    isMachineOpen: true,
  },
  {
    code: 'pack-10',
    name: 'Non proident',
    openedCount: 567,
    priceUsd: 25,
    isMachineOpen: true,
  },
  {
    code: 'pack-11',
    name: 'Sunt in culpa',
    openedCount: 321,
    priceUsd: 20,
    isMachineOpen: false,
  },
  {
    code: 'pack-12',
    name: 'Officia deserunt',
    openedCount: 89,
    isMachineOpen: true,
  },
];

export const mockPackCategoryMapping: PackCategoryMapping = {
  categories: [
    { id: 'pokemon', name: 'Pokémon' },
    { id: 'one-piece', name: 'One Piece' },
    { id: 'sports', name: 'Sports' },
    { id: 'watches', name: 'Watches' },
    { id: 'riftbound', name: 'Riftbound' },
    { id: 'lorcana', name: 'Disney Lorcana' },
  ],
  packCategories: {
    'pack-1': 'pokemon',
    'pack-2': 'one-piece',
    'pack-3': 'pokemon',
    'pack-4': 'sports',
    'pack-5': 'watches',
    'pack-6': 'lorcana',
    'pack-7': 'one-piece',
    'pack-8': 'pokemon',
    'pack-9': 'sports',
    'pack-11': 'riftbound',
    'pack-12': 'pokemon',
  },
};

const mockLatencyMs = 400;

export async function fetchMockCatalogPacks() {
  await new Promise((resolve) => setTimeout(resolve, mockLatencyMs));
  return mockCatalogPacks;
}

export async function fetchMockPackCategoryMapping() {
  await new Promise((resolve) => setTimeout(resolve, mockLatencyMs));
  return mockPackCategoryMapping;
}
