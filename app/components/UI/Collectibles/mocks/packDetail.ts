import type {
  PackPartnerCard,
  PackPartnerRarity,
} from '../providers/pack-partner/types/packPartner';
import type { PackCardsPage, PackDetail, PackRarityOdds } from '../types/packs';
import { mockCatalogPacks, mockPackCategoryMapping } from './packsCatalog';

const mockLatencyMs = 400;
const mockCardCount = 30;
const mockPackCardsPageSize = 10;

const rarityCycle: PackPartnerRarity[] = [
  'common',
  'uncommon',
  'common',
  'rare',
  'common',
  'uncommon',
  'common',
  'epic',
];

async function wait() {
  await new Promise((resolve) => setTimeout(resolve, mockLatencyMs));
}

function buildMockCard(index: number): PackPartnerCard {
  const cardNumber = index + 1;

  return {
    mint: `card-${cardNumber}`,
    name: `Lorem ipsum #${cardNumber}`,
    image: `https://example.com/cards/${cardNumber}.png`,
    grade: 'GEM-MT 10',
    gradingCompany: 'PSA',
    insuredValue:
      cardNumber === mockCardCount ? undefined : (mockCardCount - index) * 12,
    rarity: rarityCycle[index % rarityCycle.length],
    year: '2023',
    set: 'Dolor Sit',
    acquiredAt: 0,
    buyback: { status: 'unknown' },
  };
}

export const mockPackCards = Array.from({ length: mockCardCount }, (_, index) =>
  buildMockCard(index),
);

export const mockJustOpenedCards = [4, 0, 9, 2, 17, 7, 12, 1].map(
  (index, order) => ({ ...mockPackCards[index], mint: `pull-${order + 1}` }),
);

function buildMockOdds(priceUsd: number): PackRarityOdds[] {
  return [
    { rarity: 'epic', oddsPercent: 0.5, minValueUsd: priceUsd * 4 },
    {
      rarity: 'rare',
      oddsPercent: 7.5,
      minValueUsd: priceUsd * 1.5,
      maxValueUsd: priceUsd * 4,
    },
    {
      rarity: 'uncommon',
      oddsPercent: 22,
      minValueUsd: priceUsd * 0.9,
      maxValueUsd: priceUsd * 1.5,
    },
    {
      rarity: 'common',
      oddsPercent: 70,
      minValueUsd: priceUsd * 0.4,
      maxValueUsd: priceUsd * 0.9,
    },
  ];
}

export async function fetchMockPackDetail(code: string): Promise<PackDetail> {
  await wait();

  const pack = mockCatalogPacks.find((item) => item.code === code);

  if (!pack) {
    throw new Error(`Unknown pack: ${code}`);
  }

  const categoryId = mockPackCategoryMapping.packCategories[code];

  return {
    code,
    name: pack.name,
    category: mockPackCategoryMapping.categories.find(
      (category) => category.id === categoryId,
    )?.name,
    tier: 1,
    priceUsd: pack.priceUsd,
    imageUrl: pack.imageUrl,
    isAvailable: pack.isMachineOpen,
    buybackRatePercent: 85,
    averageCardValueUsd:
      pack.priceUsd === undefined ? undefined : pack.priceUsd * 1.1,
    topCardValueUsd: mockPackCards[0].insuredValue,
    odds: pack.priceUsd === undefined ? [] : buildMockOdds(pack.priceUsd),
    pulledSinceEpic: [
      { rarity: 'rare', count: 3 },
      { rarity: 'uncommon', count: 18 },
      { rarity: 'common', count: 64 },
    ],
    activity: {
      openerName: 'Lorem',
      otherOpeners: 1240,
      pullerName: 'Ipsum',
      pulledRarity: 'rare',
    },
  };
}

export async function fetchMockJustOpened() {
  await wait();
  return mockJustOpenedCards;
}

export async function fetchMockPackCardsPage(
  page: number,
): Promise<PackCardsPage> {
  await wait();

  const start = page * mockPackCardsPageSize;
  const end = start + mockPackCardsPageSize;

  return {
    cards: mockPackCards.slice(start, end),
    nextPage: end < mockPackCards.length ? page + 1 : undefined,
  };
}
