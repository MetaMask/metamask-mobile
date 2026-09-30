import { COLLECTOR_CRYPT_TIMINGS } from '../constants';
import type { CcNftWon, CcWalletCard } from '../schemas';
import { create } from '@metamask/superstruct';
import {
  SolanaNftItemStruct,
  type SolanaNftItem,
} from '../../../services/solanaNftApi.schemas';
import { nftApiCoreItem, nftApiPnftItem } from '../services/api.fixtures';
import type { CollectorCryptCard, PackOperation } from '../types';
import {
  buybackFromAvailability,
  cardFromNftItem,
  cardFromOpenPack,
  cardFromWalletCard,
  enrichWithWalletCard,
  getVisibleCards,
  isBuybackStale,
  isCollectorCryptItem,
  mergeAwardedCard,
  mergeCards,
} from './cards';

const NOW = 1_800_000_000_000;
const MINT = 'MintA111111111111111111111111111111111111111';

const createOperation = (
  overrides: Partial<PackOperation> = {},
): PackOperation => ({
  memo: 'cc-memo-1',
  packCode: 'pokemon_50',
  packName: 'Elite Pokémon Gacha Pack',
  price: 50,
  status: 'submitted',
  createdAt: NOW - 1000,
  updatedAt: NOW - 1000,
  ...overrides,
});

const createNftWon = (overrides: Partial<CcNftWon> = {}): CcNftWon => ({
  content: {
    files: [{ uri: 'https://arweave.net/front', cc_cdn: 'https://cdn/front' }],
    metadata: {
      name: 'Giratina EX',
      attributes: [
        { trait_type: 'The Grade', value: 'GEM-MT 10' },
        { trait_type: 'Grading Company', value: 'PSA' },
        { trait_type: 'Insured Value', value: '37' },
        { trait_type: 'Category', value: 'Pokemon' },
        { trait_type: 'Year', value: '2012' },
        { trait_type: 'Set', value: 'Plasma Blast' },
      ],
    },
  },
  ...overrides,
});

const createNftItem = (
  overrides: Partial<SolanaNftItem> = {},
): SolanaNftItem => ({
  token_address: MINT,
  acquired_at: '2026-09-01T10:00:00.000Z',
  nft_token: {
    name: 'Giratina EX (NFT API)',
    image_url: 'https://nft-api/image.png',
    attributes: [
      { key: 'The Grade', value: 'GEM-MT 10' },
      { key: 'Grading Company', value: 'PSA' },
      { key: 'Insured Value', value: '$45.00' },
    ],
  },
  ...overrides,
});

const createWalletCard = (
  overrides: Partial<CcWalletCard> = {},
): CcWalletCard => ({
  nftAddress: MINT,
  itemName: 'Giratina EX (CC)',
  insuredValue: '800',
  grade: 'MINT 9',
  gradingCompany: 'BGS',
  category: 'Pokemon',
  year: 2024,
  set: 'Base',
  frontImage: 'https://cc/front.png',
  images: { frontM: 'https://cc/front-m.png' },
  lastTransferredAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

const createCard = (
  overrides: Partial<CollectorCryptCard> = {},
): CollectorCryptCard => ({
  mint: MINT,
  name: 'Giratina EX',
  source: 'nftApi',
  acquiredAt: NOW - 10_000,
  buyback: { status: 'unknown' },
  ...overrides,
});

const UNRELATED_MINT = 'So11111111111111111111111111111111111111112';

const unrelatedItem = {
  ...nftApiCoreItem,
  token_address: UNRELATED_MINT,
  nft_token: {
    ...nftApiCoreItem.nft_token,
    onchain_collection_address: 'SomeOtherCollection1111111111111111111111111',
    creators: [],
  },
};

const toItem = (value: unknown): SolanaNftItem =>
  create(value, SolanaNftItemStruct);

describe('isCollectorCryptItem', () => {
  it('keeps a known CollectorCrypt card marked as spam', () => {
    const item = toItem({ ...nftApiCoreItem, isSpam: true });

    const matches = isCollectorCryptItem(item);

    expect(matches).toBe(true);
  });

  it.each([
    ['a Core card of the CollectorCrypt collection', nftApiCoreItem],
    ['a pNFT card of the CollectorCrypt collection', nftApiPnftItem],
    [
      'a card created by the CollectorCrypt update authority',
      {
        ...nftApiPnftItem,
        nft_token: {
          ...nftApiPnftItem.nft_token,
          onchain_collection_address: null,
        },
      },
    ],
  ])('accepts %s', (_label, item) => {
    expect(isCollectorCryptItem(toItem(item))).toBe(true);
  });

  it.each([
    ['an unrelated NFT', unrelatedItem],
    ['a card no longer held', { ...nftApiCoreItem, balance: 0 }],
  ])('rejects %s', (_label, item) => {
    expect(isCollectorCryptItem(toItem(item))).toBe(false);
  });
});

describe('cardFromOpenPack', () => {
  it('builds the card from the awarded NFT and the operation', () => {
    const result = {
      status: 'awarded' as const,
      mint: MINT,
      transactionSignature: 'sendSig',
      nft: createNftWon(),
      rarity: 'rare' as const,
      buybackAmount: '42500000',
    };

    const card = cardFromOpenPack(result, createOperation(), NOW);

    expect(card).toStrictEqual({
      mint: MINT,
      name: 'Giratina EX',
      image: 'https://cdn/front',
      grade: 'GEM-MT 10',
      gradingCompany: 'PSA',
      insuredValue: 37,
      category: 'Pokemon',
      year: '2012',
      set: 'Plasma Blast',
      rarity: 'rare',
      memo: 'cc-memo-1',
      packCode: 'pokemon_50',
      source: 'openPack',
      acquiredAt: NOW,
      buyback: { status: 'available', amount: '42500000', checkedAt: NOW },
    });
  });

  it('marks the buyback unknown without a valid amount', () => {
    const result = {
      status: 'awarded' as const,
      mint: MINT,
      transactionSignature: 'sendSig',
      nft: createNftWon(),
      buybackAmount: '0',
    };

    const card = cardFromOpenPack(result, createOperation(), NOW);

    expect(card.buyback).toStrictEqual({ status: 'unknown' });
    expect(card.rarity).toBeUndefined();
  });

  it('prefers json_name and falls back to other images and insuredValue', () => {
    const nft = createNftWon({
      content: {
        links: { image: 'https://links/image' },
        metadata: {
          name: 'Trunc…',
          json_name: 'Full card name',
          insuredValue: '$12.50',
        },
      },
    });
    const result = {
      status: 'awarded' as const,
      mint: MINT,
      transactionSignature: 'sendSig',
      nft,
    };

    const card = cardFromOpenPack(result, createOperation(), NOW);

    expect(card.name).toBe('Full card name');
    expect(card.image).toBe('https://links/image');
    expect(card.insuredValue).toBe(12.5);
  });
});

describe('cardFromNftItem', () => {
  it('builds the card from the NFT API item', () => {
    const card = cardFromNftItem(createNftItem());

    expect(card).toStrictEqual({
      mint: MINT,
      name: 'Giratina EX (NFT API)',
      image: 'https://nft-api/image.png',
      grade: 'GEM-MT 10',
      gradingCompany: 'PSA',
      insuredValue: 45,
      source: 'nftApi',
      acquiredAt: Date.parse('2026-09-01T10:00:00.000Z'),
      buyback: { status: 'unknown' },
    });
  });

  it('uses the Card Name attribute and leaves an unparseable acquisition date unknown', () => {
    const item = createNftItem({
      acquired_at: 'not a date',
      nft_token: { attributes: [{ key: 'card name', value: 'Pikachu' }] },
    });

    const card = cardFromNftItem(item);

    expect(card.name).toBe('Pikachu');
    expect(card.acquiredAt).toBe(0);
    expect(card.image).toBeUndefined();
  });

  it('uses the mint as name when nothing else is known', () => {
    const item = createNftItem({ nft_token: {} });

    const card = cardFromNftItem(item);

    expect(card.name).toBe(MINT);
  });
});

describe('enrichWithWalletCard', () => {
  it('takes grading and value from CollectorCrypt and keeps name and image', () => {
    const card = cardFromNftItem(createNftItem());

    const enriched = enrichWithWalletCard(card, createWalletCard());

    expect(enriched).toStrictEqual({
      ...card,
      grade: 'MINT 9',
      gradingCompany: 'BGS',
      insuredValue: 800,
      category: 'Pokemon',
      year: '2024',
      set: 'Base',
    });
  });

  it('uses the CollectorCrypt name and image when the card has none', () => {
    const card = cardFromNftItem(createNftItem({ nft_token: {} }));

    const enriched = enrichWithWalletCard(card, createWalletCard());

    expect(enriched.name).toBe('Giratina EX (CC)');
    expect(enriched.image).toBe('https://cc/front-m.png');
  });
});

describe('cardFromWalletCard', () => {
  it('builds the card from the CollectorCrypt cards API', () => {
    const card = cardFromWalletCard(createWalletCard());

    expect(card).toStrictEqual({
      mint: MINT,
      name: 'Giratina EX (CC)',
      image: 'https://cc/front-m.png',
      grade: 'MINT 9',
      gradingCompany: 'BGS',
      insuredValue: 800,
      category: 'Pokemon',
      year: '2024',
      set: 'Base',
      source: 'collectorCryptApi',
      acquiredAt: Date.parse('2026-08-01T00:00:00.000Z'),
      buyback: { status: 'unknown' },
    });
  });

  it('uses the front image and mint while leaving a missing transfer date unknown', () => {
    const walletCard = createWalletCard({
      itemName: undefined,
      images: null,
      lastTransferredAt: undefined,
    });

    const card = cardFromWalletCard(walletCard);

    expect(card.name).toBe(MINT);
    expect(card.image).toBe('https://cc/front.png');
    expect(card.acquiredAt).toBe(0);
  });
});

describe('buybackFromAvailability', () => {
  it('maps an available offer', () => {
    expect(
      buybackFromAvailability({ available: true, amount: '100' }, NOW),
    ).toStrictEqual({ status: 'available', amount: '100', checkedAt: NOW });
  });

  it('maps an unavailable offer', () => {
    expect(buybackFromAvailability({ available: false }, NOW)).toStrictEqual({
      status: 'unavailable',
      checkedAt: NOW,
    });
  });
});

describe('mergeAwardedCard', () => {
  const awarded = createCard({
    source: 'openPack',
    memo: 'memo-2',
    packCode: 'pokemon_50',
    rarity: 'epic',
    buyback: { status: 'available', amount: '5', checkedAt: NOW },
  });

  it('stores the awarded card when the mint is new', () => {
    expect(mergeAwardedCard(undefined, awarded)).toBe(awarded);
  });

  it('replaces a sold tombstone of the same mint', () => {
    const tombstone = createCard({
      sale: { status: 'completed', amount: '1', updatedAt: NOW },
    });

    expect(mergeAwardedCard(tombstone, awarded)).toBe(awarded);
  });

  it('keeps existing metadata and updates pack bookkeeping', () => {
    const existing = createCard({ grade: 'PSA 10', acquiredAt: NOW - 5 });

    const merged = mergeAwardedCard(existing, awarded);

    expect(merged).toStrictEqual({
      ...existing,
      memo: 'memo-2',
      packCode: 'pokemon_50',
      rarity: 'epic',
      buyback: { status: 'available', amount: '5', checkedAt: NOW },
    });
  });

  it('keeps the existing buyback when the award has none', () => {
    const existing = createCard({
      buyback: { status: 'unavailable', checkedAt: NOW - 1 },
    });

    const merged = mergeAwardedCard(
      existing,
      createCard({ buyback: { status: 'unknown' } }),
    );

    expect(merged.buyback).toStrictEqual(existing.buyback);
  });
});

describe('mergeCards', () => {
  it('keeps local cards as is when indexers failed', () => {
    const local = { [MINT]: createCard() };

    const merged = mergeCards({ local, indexed: undefined, now: NOW });

    expect(merged).toBe(local);
  });

  it('adds indexed cards unknown locally', () => {
    const indexed = createCard({ mint: 'MintB' });

    const merged = mergeCards({ local: {}, indexed: [indexed], now: NOW });

    expect(merged).toStrictEqual({ MintB: indexed });
  });

  it('merges indexed metadata with local bookkeeping', () => {
    const local = createCard({
      source: 'openPack',
      name: 'Local name',
      image: 'https://local/image',
      memo: 'memo-1',
      packCode: 'pokemon_50',
      rarity: 'rare',
      acquiredAt: NOW - 50,
      buyback: { status: 'available', amount: '10', checkedAt: NOW - 1 },
      sale: { status: 'pending', amount: '10', memo: 'memo-1', updatedAt: NOW },
    });
    const indexed = createCard({
      name: 'Indexed name',
      grade: 'PSA 10',
      acquiredAt: NOW - 1,
    });

    const merged = mergeCards({
      local: { [MINT]: local },
      indexed: [indexed],
      now: NOW,
    });

    expect(merged[MINT]).toStrictEqual({
      mint: MINT,
      name: 'Indexed name',
      image: 'https://local/image',
      grade: 'PSA 10',
      memo: 'memo-1',
      packCode: 'pokemon_50',
      rarity: 'rare',
      source: 'nftApi',
      acquiredAt: NOW - 50,
      buyback: { status: 'available', amount: '10', checkedAt: NOW - 1 },
      sale: { status: 'pending', amount: '10', memo: 'memo-1', updatedAt: NOW },
    });
  });

  it('keeps the local name when the indexed name is only the mint', () => {
    const local = createCard({ name: 'Local name' });
    const indexed = createCard({ name: MINT });

    const merged = mergeCards({
      local: { [MINT]: local },
      indexed: [indexed],
      now: NOW,
    });

    expect(merged[MINT].name).toBe('Local name');
  });

  it('keeps a freshly opened card that is not indexed yet', () => {
    const local = createCard({
      source: 'openPack',
      acquiredAt: NOW - COLLECTOR_CRYPT_TIMINGS.INDEXER_GRACE + 1,
    });

    const merged = mergeCards({
      local: { [MINT]: local },
      indexed: [],
      now: NOW,
    });

    expect(merged).toStrictEqual({ [MINT]: local });
  });

  it('drops an opened card missing from the indexers after the grace period', () => {
    const local = createCard({
      source: 'openPack',
      acquiredAt: NOW - COLLECTOR_CRYPT_TIMINGS.INDEXER_GRACE - 1,
    });

    const merged = mergeCards({
      local: { [MINT]: local },
      indexed: [],
      now: NOW,
    });

    expect(merged).toStrictEqual({});
  });

  it('drops an indexed card that is no longer owned', () => {
    const local = createCard({ source: 'nftApi' });

    const merged = mergeCards({
      local: { [MINT]: local },
      indexed: [],
      now: NOW,
    });

    expect(merged).toStrictEqual({});
  });

  it('keeps a card with a pending sale even when not indexed', () => {
    const local = createCard({
      sale: { status: 'pending', amount: '1', updatedAt: NOW - 1 },
    });

    const merged = mergeCards({
      local: { [MINT]: local },
      indexed: [],
      now: NOW,
    });

    expect(merged).toStrictEqual({ [MINT]: local });
  });

  it('keeps a sold tombstone while the indexers still return the mint', () => {
    const tombstone = createCard({
      sale: { status: 'completed', amount: '1', updatedAt: NOW - 1000 },
    });

    const merged = mergeCards({
      local: { [MINT]: tombstone },
      indexed: [createCard({ name: 'Indexed' })],
      now: NOW,
    });

    expect(merged).toStrictEqual({ [MINT]: tombstone });
  });

  it('drops a sold tombstone once the indexers stop returning the mint', () => {
    const tombstone = createCard({
      sale: { status: 'completed', amount: '1', updatedAt: NOW - 1000 },
    });

    const merged = mergeCards({
      local: { [MINT]: tombstone },
      indexed: [],
      now: NOW,
    });

    expect(merged).toStrictEqual({});
  });

  it('shows an externally reacquired card before the sold tombstone expires', () => {
    const tombstone = createCard({
      sale: { status: 'completed', amount: '1', updatedAt: NOW - 1000 },
    });
    const indexed = cardFromNftItem(
      createNftItem({ acquired_at: new Date(NOW - 500).toISOString() }),
    );

    const merged = mergeCards({
      local: { [MINT]: tombstone },
      indexed: [indexed],
      now: NOW,
    });

    expect(getVisibleCards(merged)).toStrictEqual([indexed]);
    expect(merged[MINT].sale).toBeUndefined();
  });

  it.each([undefined, 'not a date', new Date(NOW - 1000).toISOString()])(
    'keeps a sold card hidden when acquired_at is %p',
    (acquiredAt) => {
      const tombstone = createCard({
        sale: { status: 'completed', amount: '1', updatedAt: NOW - 1000 },
      });
      const indexed = cardFromNftItem(
        createNftItem({ acquired_at: acquiredAt }),
      );

      const merged = mergeCards({
        local: { [MINT]: tombstone },
        indexed: [indexed],
        now: NOW,
      });

      expect(merged[MINT]).toBe(tombstone);
      expect(getVisibleCards(merged)).toStrictEqual([]);
    },
  );

  it('uses first-seen time when storing a new card without an acquisition date', () => {
    const indexed = cardFromNftItem(createNftItem({ acquired_at: undefined }));

    const merged = mergeCards({ local: {}, indexed: [indexed], now: NOW });

    expect(merged[MINT].acquiredAt).toBe(NOW);
  });

  it('replaces a sold tombstone older than TERMINAL_TTL by the indexed card', () => {
    const tombstone = createCard({
      sale: {
        status: 'completed',
        amount: '1',
        updatedAt: NOW - COLLECTOR_CRYPT_TIMINGS.TERMINAL_TTL - 1,
      },
    });
    const indexed = createCard({ name: 'Owned again' });

    const merged = mergeCards({
      local: { [MINT]: tombstone },
      indexed: [indexed],
      now: NOW,
    });

    expect(merged).toStrictEqual({ [MINT]: indexed });
  });
});

describe('isBuybackStale', () => {
  const { BUYBACK_AVAILABLE_TTL, BUYBACK_UNAVAILABLE_TTL } =
    COLLECTOR_CRYPT_TIMINGS;

  it.each([
    ['unknown', createCard(), true],
    [
      'available and fresh',
      createCard({
        buyback: {
          status: 'available',
          amount: '1',
          checkedAt: NOW - BUYBACK_AVAILABLE_TTL,
        },
      }),
      false,
    ],
    [
      'available and old',
      createCard({
        buyback: {
          status: 'available',
          amount: '1',
          checkedAt: NOW - BUYBACK_AVAILABLE_TTL - 1,
        },
      }),
      true,
    ],
    [
      'unavailable and fresh',
      createCard({
        buyback: {
          status: 'unavailable',
          checkedAt: NOW - BUYBACK_AVAILABLE_TTL - 1,
        },
      }),
      false,
    ],
    [
      'unavailable and old',
      createCard({
        buyback: {
          status: 'unavailable',
          checkedAt: NOW - BUYBACK_UNAVAILABLE_TTL - 1,
        },
      }),
      true,
    ],
    [
      'available without checkedAt',
      createCard({ buyback: { status: 'available', amount: '1' } }),
      true,
    ],
    [
      'being sold',
      createCard({
        sale: { status: 'pending', amount: '1', updatedAt: NOW },
      }),
      false,
    ],
  ])('returns the staleness of a card %s', (_label, card, expected) => {
    expect(isBuybackStale(card, NOW)).toBe(expected);
  });
});

describe('getVisibleCards', () => {
  it('returns an empty list without cards', () => {
    expect(getVisibleCards(undefined)).toStrictEqual([]);
  });

  it('hides completed sales and sorts by acquiredAt desc', () => {
    const older = createCard({ mint: 'A', acquiredAt: 1 });
    const newer = createCard({ mint: 'B', acquiredAt: 2 });
    const pendingSale = createCard({
      mint: 'C',
      acquiredAt: 3,
      sale: { status: 'pending', amount: '1', updatedAt: 3 },
    });
    const sold = createCard({
      mint: 'D',
      acquiredAt: 4,
      sale: { status: 'completed', amount: '1', updatedAt: 4 },
    });

    const visible = getVisibleCards({
      A: older,
      B: newer,
      C: pendingSale,
      D: sold,
    });

    expect(visible.map((card) => card.mint)).toStrictEqual(['C', 'B', 'A']);
  });
});
