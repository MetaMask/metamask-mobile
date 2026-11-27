import type { PackPartnerCard } from '../providers/pack-partner/types/packPartner';

const hourMs = 60 * 60 * 1000;

export function buildMockCollectionCards(now: number): PackPartnerCard[] {
  return [
    {
      mint: 'card-1',
      name: 'Lorem ipsum PSA 10',
      grade: 'GEM-MT 10',
      gradingCompany: 'PSA',
      insuredValue: 420,
      rarity: 'epic',
      acquiredAt: now - 2 * hourMs,
      buyback: { status: 'available' },
    },
    {
      mint: 'card-2',
      name: 'Dolor sit amet',
      grade: 'MINT 9',
      gradingCompany: 'PSA',
      insuredValue: 85,
      rarity: 'rare',
      acquiredAt: now - 71.5 * hourMs,
      buyback: { status: 'available' },
    },
    {
      mint: 'card-3',
      name: 'Consectetur adipiscing elit sed do eiusmod',
      grade: 'NM-MT 8',
      gradingCompany: 'BGS',
      insuredValue: 32,
      rarity: 'uncommon',
      acquiredAt: now - 5 * 24 * hourMs,
      buyback: { status: 'unavailable' },
    },
    {
      mint: 'card-4',
      name: 'Tempor incididunt',
      rarity: 'common',
      acquiredAt: now - 30 * hourMs,
      buyback: { status: 'available' },
    },
    {
      mint: 'card-5',
      name: 'Magna aliqua',
      grade: 'MINT 9',
      gradingCompany: 'CGC',
      insuredValue: 150,
      rarity: 'rare',
      acquiredAt: now - 12 * 24 * hourMs,
      buyback: { status: 'unknown' },
    },
  ];
}

const mockLatencyMs = 400;

export async function fetchMockCollectionCards() {
  await new Promise((resolve) => setTimeout(resolve, mockLatencyMs));
  return buildMockCollectionCards(Date.now());
}
