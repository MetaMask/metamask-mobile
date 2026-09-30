import { COLLECTOR_CRYPT_TIMINGS } from '../constants';
import {
  CcNftWonStruct,
  CcWalletCardStruct,
  type CcNftWon,
  type CcWalletCard,
} from '../schemas';
import { create } from '@metamask/superstruct';
import {
  SolanaNftItemStruct,
  type SolanaNftItem,
} from '../../../services/solanaNftApi.schemas';
import {
  nftApiCoreItem,
  nftApiPnftItem,
  nftWon,
} from '../services/api.fixtures';
import type { CollectorCryptCard, PackOperation } from '../types';
import {
  buybackFromAvailability,
  cardFromNftItem,
  cardFromOpenPack,
  cardFromWalletCard,
  enrichWithWalletCard,
  getCardValue,
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
    files: [
      { uri: 'https://arweave.net/front', cc_cdn: 'https://cdn/front' },
      {
        uri: 'https://arweave.net/back',
        cc_cdn: 'https://cdn/back',
        mime: 'image/jpeg',
      },
    ],
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
  backImage: 'https://cc/back.png',
  images: {
    front: 'https://cc/front-full.png',
    frontM: 'https://cc/front-m.png',
    back: 'https://cc/back-full.png',
    backM: 'https://cc/back-m.png',
  },
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
  it('reads the grading certificate from the recorded award attributes', () => {
    const result = {
      status: 'awarded' as const,
      mint: nftWon.id,
      transactionSignature: 'sendSig',
      nft: create(nftWon, CcNftWonStruct),
    };

    const card = cardFromOpenPack(result, createOperation(), NOW);

    expect(card.gradingId).toBe('145822162');
  });

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
      image: 'https://arweave.net/front',
      mediumImage: 'https://cdn/front',
      backImage: 'https://arweave.net/back',
      mediumBackImage: 'https://cdn/back',
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
    expect(card.backImage).toBeUndefined();
  });

  it.each(['video/mp4', 'application/json', undefined])(
    'omits the second file when its MIME type is %p',
    (mime) => {
      const nft = createNftWon();
      nft.content.files = [
        { uri: 'https://cdn/front' },
        { uri: 'https://cdn/other-file', mime },
      ];
      const result = {
        status: 'awarded' as const,
        mint: MINT,
        transactionSignature: 'sendSig',
        nft,
      };

      const card = cardFromOpenPack(result, createOperation(), NOW);

      expect(card.backImage).toBeUndefined();
      expect(card.mediumBackImage).toBeUndefined();
    },
  );

  it.each([
    [
      { cdn_uri: 'https://cdn/back', uri: 'https://origin/back' },
      'https://origin/back',
    ],
    [{ uri: 'https://origin/back' }, 'https://origin/back'],
    [{ cc_cdn: 'https://cdn/back' }, 'https://cdn/back'],
    [{ cdn_uri: 'https://proxy/back' }, 'https://proxy/back'],
  ])('uses the available back image URL from %p', (file, expected) => {
    const nft = createNftWon();
    nft.content.files = [
      { uri: 'https://cdn/front' },
      { ...file, mime: 'image/jpeg' },
    ];
    const result = {
      status: 'awarded' as const,
      mint: MINT,
      transactionSignature: 'sendSig',
      nft,
    };

    const card = cardFromOpenPack(result, createOperation(), NOW);

    expect(card.backImage).toBe(expected);
  });

  it('keeps original images separate from the recorded CDN previews', () => {
    const result = {
      status: 'awarded' as const,
      mint: nftWon.id,
      transactionSignature: 'sendSig',
      nft: create(nftWon, CcNftWonStruct),
    };

    const card = cardFromOpenPack(result, createOperation(), NOW);

    expect(card.image).toBe(nftWon.content.files[0].uri);
    expect(card.mediumImage).toBe(nftWon.content.files[0].cc_cdn);
    expect(card.backImage).toBe(nftWon.content.files[1].uri);
    expect(card.mediumBackImage).toBe(nftWon.content.files[1].cc_cdn);
  });

  it('uses the proxy preview when CollectorCrypt CDN URLs are absent', () => {
    const nft = createNftWon();
    nft.content.files = [
      { uri: 'https://origin/front', cdn_uri: 'https://proxy/front' },
      {
        uri: 'https://origin/back',
        cdn_uri: 'https://proxy/back',
        mime: 'image/jpeg',
      },
    ];

    const card = cardFromOpenPack(
      { status: 'awarded', mint: MINT, transactionSignature: 'sendSig', nft },
      createOperation(),
      NOW,
    );

    expect(card.mediumImage).toBe('https://proxy/front');
    expect(card.mediumBackImage).toBe('https://proxy/back');
  });
});

describe('cardFromNftItem', () => {
  it.each([
    ['Core', nftApiCoreItem, '140691487'],
    ['pNFT', nftApiPnftItem, '140024105'],
  ])(
    'reads the grading certificate from the %s NFT API item',
    (_standard, item, expected) => {
      const parsed = toItem(item);

      const card = cardFromNftItem(parsed);

      expect(card.gradingId).toBe(expected);
    },
  );

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
  it('takes original images, grading and value from CollectorCrypt and keeps the name', () => {
    const card = cardFromNftItem(createNftItem());

    const enriched = enrichWithWalletCard(card, createWalletCard());

    expect(enriched).toStrictEqual({
      ...card,
      image: 'https://cc/front-full.png',
      mediumImage: 'https://cc/front-m.png',
      backImage: 'https://cc/back-full.png',
      mediumBackImage: 'https://cc/back-m.png',
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
    expect(enriched.image).toBe('https://cc/front-full.png');
    expect(enriched.backImage).toBe('https://cc/back-full.png');
  });

  it('keeps known images when the wallet only supplies medium variants', () => {
    const card = createCard({
      image: 'https://pack/front',
      backImage: 'https://pack/back',
    });
    const walletCard = createWalletCard({
      images: {
        frontM: 'https://cc/front-m.png',
        backM: 'https://cc/back-m.png',
      },
      frontImage: undefined,
      backImage: undefined,
    });

    const enriched = enrichWithWalletCard(card, walletCard);

    expect(enriched.image).toBe(card.image);
    expect(enriched.backImage).toBe(card.backImage);
    expect(enriched.mediumImage).toBe('https://cc/front-m.png');
    expect(enriched.mediumBackImage).toBe('https://cc/back-m.png');
  });

  it('keeps known previews when the wallet only supplies original images', () => {
    const card = createCard({
      mediumImage: 'https://pack/front-preview',
      mediumBackImage: 'https://pack/back-preview',
    });

    const enriched = enrichWithWalletCard(
      card,
      createWalletCard({ images: undefined }),
    );

    expect(enriched.mediumImage).toBe(card.mediumImage);
    expect(enriched.mediumBackImage).toBe(card.mediumBackImage);
  });

  it('keeps the grading certificate when wallet metadata only provides a card serial', () => {
    const card = cardFromNftItem(toItem(nftApiCoreItem));
    const walletCard = createWalletCard({ serial: '051' });

    const enriched = enrichWithWalletCard(card, walletCard);

    expect(enriched.gradingId).toBe('140691487');
  });

  it.each([null, { status: 'Closed', currency: 'USDC', price: '900' }])(
    'clears a previous asking price when the refreshed listing is %p',
    (listing) => {
      const local = createCard({ insuredValue: 800, listedPriceUsd: 900 });
      const walletCard = create(
        { ...createWalletCard({ listing }), listedPriceUsd: '900' },
        CcWalletCardStruct,
      );

      const enriched = enrichWithWalletCard(local, walletCard);
      const merged = mergeCards({
        local: { [MINT]: local },
        indexed: [enriched],
        now: NOW,
      });

      expect(enriched).not.toHaveProperty('listedPriceUsd');
      expect(merged[MINT]).not.toHaveProperty('listedPriceUsd');
      expect(getCardValue(merged[MINT])).toBe(800);
    },
  );
});

describe('cardFromWalletCard', () => {
  it('builds the card from the CollectorCrypt cards API', () => {
    const card = cardFromWalletCard(createWalletCard());

    expect(card).toStrictEqual({
      mint: MINT,
      name: 'Giratina EX (CC)',
      image: 'https://cc/front-full.png',
      mediumImage: 'https://cc/front-m.png',
      backImage: 'https://cc/back-full.png',
      mediumBackImage: 'https://cc/back-m.png',
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
    expect(card.backImage).toBe('https://cc/back.png');
    expect(card.mediumImage).toBeUndefined();
    expect(card.mediumBackImage).toBeUndefined();
    expect(card.acquiredAt).toBe(0);
  });

  it('falls back to medium images when the originals are unavailable', () => {
    const walletCard = createWalletCard({
      images: {
        frontM: 'https://cc/front-m.png',
        backM: 'https://cc/back-m.png',
      },
      frontImage: undefined,
      backImage: undefined,
    });

    const card = cardFromWalletCard(walletCard);

    expect(card.image).toBe('https://cc/front-m.png');
    expect(card.backImage).toBe('https://cc/back-m.png');
    expect(card.mediumImage).toBe('https://cc/front-m.png');
    expect(card.mediumBackImage).toBe('https://cc/back-m.png');
  });

  it('leaves the grading certificate absent when only the card serial is known', () => {
    const walletCard = createWalletCard({ serial: '017' });

    const card = cardFromWalletCard(walletCard);

    expect(card.gradingId).toBeUndefined();
  });

  it.each([
    ['USDC', '20', 20],
    ['USD', 20, 20],
    ['USDC', 0, 0],
  ] as const)(
    'reads an active %s listing priced at %p',
    (currency, price, expected) => {
      const walletCard = create(
        createWalletCard({ listing: { status: 'Active', currency, price } }),
        CcWalletCardStruct,
      );

      const card = cardFromWalletCard(walletCard);

      expect(card.listedPriceUsd).toBe(expected);
      expect(card.insuredValue).toBe(800);
    },
  );

  it.each([
    undefined,
    { status: 'Closed', currency: 'USDC', price: '20' },
    { status: 'Active', currency: 'SOL', price: '20' },
    { status: 'Active', price: '20' },
    { currency: 'USDC', price: '20' },
  ])('ignores an absent or unsupported listing %p', (listing) => {
    const walletCard = createWalletCard({ listing });

    const card = cardFromWalletCard(walletCard);

    expect(card).not.toHaveProperty('listedPriceUsd');
  });

  it.each(['-20', 'not a price', '', 'Infinity', null])(
    'ignores an asking price of %p',
    (price) => {
      const walletCard = createWalletCard({
        listing: { status: 'Active', currency: 'USDC', price },
      });

      const card = cardFromWalletCard(walletCard);

      expect(card).not.toHaveProperty('listedPriceUsd');
    },
  );
});

describe('getCardValue', () => {
  it.each([
    [15, 20, 20],
    [42, 39, 42],
    [15, undefined, 15],
    [undefined, 20, 20],
    [0, undefined, 0],
    [undefined, 0, 0],
    [undefined, undefined, undefined],
  ])(
    'uses insured %p and listed %p to return %p',
    (insuredValue, listedPriceUsd, expected) => {
      const card = createCard({ insuredValue, listedPriceUsd });

      const value = getCardValue(card);

      expect(value).toBe(expected);
    },
  );

  it('does not substitute a buyback offer for an unknown card value', () => {
    const card = createCard({
      buyback: { status: 'available', amount: '100000000', checkedAt: NOW },
    });

    const value = getCardValue(card);

    expect(value).toBeUndefined();
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
    const existing = createCard({
      grade: 'PSA 10',
      acquiredAt: NOW - 5,
      image: 'https://existing/front',
      mediumImage: 'https://existing/front-preview',
      backImage: 'https://existing/back',
      mediumBackImage: 'https://existing/back-preview',
    });

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

  it('refreshes older cached images from the awarded card', () => {
    const existing = createCard({
      image: 'https://existing/front-medium',
      mediumImage: 'https://existing/front-preview',
      backImage: 'https://existing/back-medium',
      mediumBackImage: 'https://existing/back-preview',
    });
    const awardWithImages = {
      ...awarded,
      image: 'https://award/front-original',
      mediumImage: 'https://award/front-preview',
      backImage: 'https://award/back-original',
      mediumBackImage: 'https://award/back-preview',
    };

    const merged = mergeAwardedCard(existing, awardWithImages);

    expect(merged.image).toBe(awardWithImages.image);
    expect(merged.backImage).toBe(awardWithImages.backImage);
    expect(merged.mediumImage).toBe(awardWithImages.mediumImage);
    expect(merged.mediumBackImage).toBe(awardWithImages.mediumBackImage);
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

  it('updates the asking price from refreshed wallet data', () => {
    const local = createCard({ listedPriceUsd: 900 });
    const indexed = cardFromWalletCard(
      createWalletCard({
        listing: { status: 'Active', currency: 'USDC', price: '700' },
      }),
    );

    const merged = mergeCards({
      local: { [MINT]: local },
      indexed: [indexed],
      now: NOW,
    });

    expect(merged[MINT].listedPriceUsd).toBe(700);
    expect(getCardValue(merged[MINT])).toBe(800);
  });

  it('merges indexed metadata with local bookkeeping', () => {
    const local = createCard({
      source: 'openPack',
      name: 'Local name',
      image: 'https://local/image',
      mediumImage: 'https://local/front-preview',
      backImage: 'https://local/back',
      mediumBackImage: 'https://local/back-preview',
      gradingId: '145822162',
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
      mediumImage: 'https://local/front-preview',
      backImage: 'https://local/back',
      mediumBackImage: 'https://local/back-preview',
      gradingId: '145822162',
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

  it('updates the back image when the indexer provides one', () => {
    const local = createCard({ backImage: 'https://local/back' });
    const indexed = createCard({ backImage: 'https://indexed/back' });

    const merged = mergeCards({
      local: { [MINT]: local },
      indexed: [indexed],
      now: NOW,
    });

    expect(merged[MINT].backImage).toBe(indexed.backImage);
  });

  it('replaces cached medium images with originals after wallet synchronization', () => {
    const local = createCard({
      image: 'https://cc/front-m.png',
      backImage: 'https://cc/back-m.png',
      mediumImage: 'https://local/front-preview',
      mediumBackImage: 'https://local/back-preview',
    });
    const indexed = enrichWithWalletCard(
      cardFromNftItem(createNftItem()),
      createWalletCard(),
    );

    const merged = mergeCards({
      local: { [MINT]: local },
      indexed: [indexed],
      now: NOW,
    });

    expect(merged[MINT].image).toBe('https://cc/front-full.png');
    expect(merged[MINT].backImage).toBe('https://cc/back-full.png');
    expect(merged[MINT].mediumImage).toBe('https://cc/front-m.png');
    expect(merged[MINT].mediumBackImage).toBe('https://cc/back-m.png');
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
