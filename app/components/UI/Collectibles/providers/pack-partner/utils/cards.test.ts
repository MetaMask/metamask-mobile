import { PACK_PARTNER_TIMINGS } from '../constants/packPartner';
import {
  PpNftWonStruct,
  PpWalletCardStruct,
  type PpNftWon,
  type PpWalletCard,
} from '../schemas/packPartner';
import { create } from '@metamask/superstruct';
import { nftWon } from '../services/api.fixtures';
import type { PackStatus } from '../../../services/clients/PackPartnerApiClient';
import type {
  PackPartnerCard,
  PackPartnerPackOperation,
} from '../types/packPartner';
import {
  buybackFromAvailability,
  cardFromOpenPack,
  cardFromPackStatus,
  cardFromWalletCard,
  isBuybackBelow,
  isInBuybackWindow,
  inventoryCardFromNft,
  normalizeNftStandard,
  sortOwnedCards,
} from './cards';

const NOW = 1_800_000_000_000;
const MINT = 'MintA111111111111111111111111111111111111111';

describe('inventoryCardFromNft set metadata', () => {
  it('preserves the Set attribute separately from the original NFT name', () => {
    const nft = {
      nft_address: MINT,
      content: {
        metadata: {
          name: '2024 Exeggcute CGC 10',
          attributes: [
            { trait_type: 'Set', value: 'Paradise Dragona - sv7a - Japanese' },
            { trait_type: 'Year', value: '2024' },
            { trait_type: 'Category', value: 'Pokemon' },
            { trait_type: 'Grading ID', value: 'certificate-123' },
          ],
        },
      },
    };

    const card = inventoryCardFromNft(nft);

    expect(card.set).toBe('Paradise Dragona - sv7a - Japanese');
    expect(card.name).toBe(nft.content.metadata.name);
    expect(card).toMatchObject({
      year: '2024',
      category: 'Pokemon',
      gradingId: 'certificate-123',
    });
    expect(card).not.toHaveProperty('buyback');
  });
});

const createOperation = (
  overrides: Partial<PackPartnerPackOperation> = {},
): PackPartnerPackOperation => ({
  memo: 'cc-memo-1',
  packCode: 'pokemon_50',
  packName: 'Elite Pokémon Collectibles Pack',
  price: 50,
  priceAmount: '50000000',
  status: 'submitted',
  createdAt: NOW - 1000,
  updatedAt: NOW - 1000,
  ...overrides,
});

const createNftWon = (overrides: Partial<PpNftWon> = {}): PpNftWon => ({
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

const createWalletCard = (
  overrides: Partial<PpWalletCard> = {},
): PpWalletCard => ({
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
  overrides: Partial<PackPartnerCard> = {},
): PackPartnerCard => ({
  mint: MINT,
  name: 'Giratina EX',
  acquiredAt: NOW - 10_000,
  buyback: { status: 'unknown' },
  ...overrides,
});

describe('normalizeNftStandard', () => {
  it.each([
    ['core', 'core'],
    ['MplCoreAsset', 'core'],
    ['PROGRAMMABLE_NFT', 'pnft'],
    ['ProgrammableNonFungible', 'pnft'],
    ['NonFungible', 'nft'],
    ['cnft-core', 'cnft-core'],
    ['CompressedCoreAsset', 'unknown'],
    ['cnft', 'unknown'],
    ['compressed', 'unknown'],
    ['BubblegumV1', 'unknown'],
    ['UNKNOWN', 'unknown'],
    [undefined, 'unknown'],
  ] as const)('maps %p to %s', (raw, expected) => {
    const standard = normalizeNftStandard(raw);

    expect(standard).toBe(expected);
  });
});

describe('cardFromPackStatus', () => {
  const DELIVERED: PackStatus = {
    memo: 'cc-memo-1',
    isPaid: true,
    isDelivered: true,
    isRefunded: false,
    mint: MINT,
    rarity: 'uncommon',
    insuredValue: 80,
  };

  it('builds the delivered card from the pack status and the operation', () => {
    const card = cardFromPackStatus({
      mint: MINT,
      status: DELIVERED,
      operation: createOperation(),
      now: NOW,
    });

    expect(card).toStrictEqual({
      mint: MINT,
      name: 'Elite Pokémon Collectibles Pack',
      insuredValue: 80,
      rarity: 'uncommon',
      memo: 'cc-memo-1',
      packCode: 'pokemon_50',
      acquiredAt: NOW,
      buyback: { status: 'unknown' },
    });
  });

  it('copies the purchase batch from the operation', () => {
    const card = cardFromPackStatus({
      mint: MINT,
      status: DELIVERED,
      operation: createOperation({ batchId: 'yolo-1' }),
      now: NOW,
    });

    expect(card.batchId).toBe('yolo-1');
  });

  it('records the confirmed Turbo payout as an automatic sale without an offer', () => {
    const card = cardFromPackStatus({
      mint: MINT,
      status: {
        ...DELIVERED,
        automaticSale: true,
        buybackAmount: '42500000',
      },
      operation: createOperation(),
      now: NOW,
    });

    expect(card.buyback).toStrictEqual({ status: 'unavailable' });
    expect(card.sale).toStrictEqual({
      status: 'completed',
      automatic: true,
      amount: '42500000',
      updatedAt: NOW,
    });
  });
});

describe('cardFromOpenPack', () => {
  it('retains the awarded compressed asset ID and cnft-core standard', () => {
    const result = {
      status: 'awarded' as const,
      mint: MINT,
      transactionSignature: 'sendSig',
      nft: createNftWon({ nft_standard: 'cnft-core' }),
    };

    const card = cardFromOpenPack(result, createOperation(), NOW);

    expect(card).toMatchObject({ mint: MINT, nftStandard: 'cnft-core' });
  });

  it('reads the grading certificate from the recorded award attributes', () => {
    const result = {
      status: 'awarded' as const,
      mint: nftWon.id,
      transactionSignature: 'sendSig',
      nft: create(nftWon, PpNftWonStruct),
    };

    const card = cardFromOpenPack(result, createOperation(), NOW);

    expect(card.gradingId).toBe('145822162');
    expect(card.nftStandard).toBe('core');
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
      nftStandard: 'unknown',
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
      acquiredAt: NOW,
      buyback: { status: 'available', amount: '42500000' },
    });
  });

  it('copies the purchase batch from the operation', () => {
    const result = {
      status: 'awarded' as const,
      mint: MINT,
      transactionSignature: 'sendSig',
      nft: createNftWon(),
    };

    const card = cardFromOpenPack(
      result,
      createOperation({ batchId: 'yolo-1' }),
      NOW,
    );

    expect(card.batchId).toBe('yolo-1');
  });

  it('records the confirmed Turbo payout as an automatic sale without an offer', () => {
    const result = {
      status: 'awarded' as const,
      mint: MINT,
      transactionSignature: 'turbo-signature',
      nft: createNftWon(),
      buybackAmount: '42500000',
      automaticSale: true,
    };

    const card = cardFromOpenPack(result, createOperation(), NOW);

    expect(card.buyback).toStrictEqual({ status: 'unavailable' });
    expect(card.sale).toStrictEqual({
      status: 'completed',
      automatic: true,
      amount: '42500000',
      signature: 'turbo-signature',
      updatedAt: NOW,
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
      nft: create(nftWon, PpNftWonStruct),
    };

    const card = cardFromOpenPack(result, createOperation(), NOW);

    expect(card.image).toBe(nftWon.content.files[0].uri);
    expect(card.mediumImage).toBe(nftWon.content.files[0].cc_cdn);
    expect(card.backImage).toBe(nftWon.content.files[1].uri);
    expect(card.mediumBackImage).toBe(nftWon.content.files[1].cc_cdn);
  });

  it('uses the proxy preview when PackPartner CDN URLs are absent', () => {
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

describe('cardFromWalletCard', () => {
  it.each([
    ['pNFT', 'pnft'],
    ['cnft-core', 'cnft-core'],
  ] as const)(
    'stores the %s standard from the cards API as %s',
    (raw, standard) => {
      const walletCard = createWalletCard({ nftStandard: raw });

      const card = cardFromWalletCard(walletCard);

      expect(card.nftStandard).toBe(standard);
    },
  );

  it('builds the card from the PackPartner cards API', () => {
    const card = cardFromWalletCard(createWalletCard());

    expect(card).toStrictEqual({
      mint: MINT,
      name: 'Giratina EX (CC)',
      nftStandard: 'unknown',
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
        PpWalletCardStruct,
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

describe('buybackFromAvailability', () => {
  it('maps an available offer', () => {
    const buyback = buybackFromAvailability({
      available: true,
      amount: '100',
    });

    expect(buyback).toStrictEqual({ status: 'available', amount: '100' });
  });

  it('maps an unavailable offer', () => {
    const buyback = buybackFromAvailability({ available: false });

    expect(buyback).toStrictEqual({ status: 'unavailable' });
  });
});

describe('isInBuybackWindow', () => {
  const { BUYBACK_WINDOW } = PACK_PARTNER_TIMINGS;

  it.each([
    [true, 'acquired just now', NOW],
    [true, 'acquired just inside 72h', NOW - BUYBACK_WINDOW + 1],
    [false, 'acquired exactly 72h ago', NOW - BUYBACK_WINDOW],
    [false, 'acquired more than 72h ago', NOW - BUYBACK_WINDOW - 1],
    [true, 'with an unknown acquisition date', 0],
  ])('returns %p for a card %s', (expected, _label, acquiredAt) => {
    const card = createCard({ acquiredAt });

    const inWindow = isInBuybackWindow(card, NOW);

    expect(inWindow).toBe(expected);
  });
});

describe('isBuybackBelow', () => {
  it.each([
    ['equal', '100', '100', false],
    ['higher', '101', '100', false],
    ['lower', '99', '100', true],
    ['zero', '0', '100', true],
    ['negative', '-1', '-2', true],
    ['missing', undefined, '100', true],
    ['confirmed without an amount', '100', '', true],
    ['confirmed as malformed', '100', '1.5', true],
    ['confirmed as negative', '100', '-1', true],
  ])(
    'compares a %s offer with the confirmed amount',
    (_label, amount, expectedAmount, expected) => {
      expect(isBuybackBelow(amount, expectedAmount)).toBe(expected);
    },
  );
});

describe('sortOwnedCards', () => {
  it('returns an empty list without cards', () => {
    expect(sortOwnedCards([])).toStrictEqual([]);
  });

  it('sorts by acquisition date, newest first, then by mint', () => {
    const unknown = createCard({ mint: 'A', acquiredAt: 0 });
    const older = createCard({ mint: 'B', acquiredAt: 1 });
    const newerC = createCard({ mint: 'C', acquiredAt: 2 });
    const newerD = createCard({ mint: 'D', acquiredAt: 2 });

    const sorted = sortOwnedCards([unknown, newerD, older, newerC]);

    expect(sorted.map((card) => card.mint)).toStrictEqual(['C', 'D', 'B', 'A']);
  });

  it('returns a copy and leaves the input order unchanged', () => {
    const older = createCard({ mint: 'A', acquiredAt: 1 });
    const newer = createCard({ mint: 'B', acquiredAt: 2 });
    const cards = [older, newer];

    const sorted = sortOwnedCards(cards);

    expect(sorted).not.toBe(cards);
    expect(cards).toStrictEqual([older, newer]);
    expect(sorted[0]).toBe(newer);
  });

  it('keeps a sold card in the server snapshot', () => {
    const sold = createCard({
      mint: 'A',
      acquiredAt: 2,
      sale: { status: 'completed', amount: '1', updatedAt: NOW },
    });
    const owned = createCard({ mint: 'B', acquiredAt: 1 });

    const sorted = sortOwnedCards([owned, sold]);

    expect(sorted).toStrictEqual([sold, owned]);
  });
});
