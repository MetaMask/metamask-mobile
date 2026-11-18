import {
  PACK_PARTNER_BUYBACK_OFFER_STALE_TIME,
  PACK_PARTNER_GREATEST_HITS_STALE_TIME,
  PACK_PARTNER_INVENTORY_STALE_TIME,
  PACK_PARTNER_OWNED_CARDS_STALE_TIME,
  PACK_PARTNER_PACKS_STALE_TIME,
  PACK_PARTNER_RECENT_OPENINGS_STALE_TIME,
  packPartnerQueries,
  packPartnerQueryFamilies,
} from './packPartnerQueries';

const ADDRESS = 'So1anaWa11etAddre55';
const MINT = 'CardMint111111111111';

describe('packPartnerQueries', () => {
  it('pins the service stale time of every read', () => {
    expect(PACK_PARTNER_PACKS_STALE_TIME).toBe(0);
    expect(PACK_PARTNER_INVENTORY_STALE_TIME).toBe(30_000);
    expect(PACK_PARTNER_GREATEST_HITS_STALE_TIME).toBe(5 * 60_000);
    expect(PACK_PARTNER_OWNED_CARDS_STALE_TIME).toBe(30_000);
    expect(PACK_PARTNER_BUYBACK_OFFER_STALE_TIME).toBe(30_000);
    expect(PACK_PARTNER_RECENT_OPENINGS_STALE_TIME).toBe(0);
  });

  it('describes the pack catalogue read by environment', () => {
    const descriptor = packPartnerQueries.getPacks('mainnet');

    expect(descriptor).toEqual({
      queryKey: ['PackPartnerDataService:getPacks', 'mainnet'],
      family: ['PackPartnerDataService:getPacks', 'mainnet'],
      staleTime: PACK_PARTNER_PACKS_STALE_TIME,
    });
  });

  it('describes a pack pool read whose family covers every pack of the environment', () => {
    const descriptor = packPartnerQueries.getPackInventory(
      'mainnet',
      'pokemon_50',
    );

    expect(descriptor).toEqual({
      queryKey: [
        'PackPartnerDataService:getPackInventory',
        'mainnet',
        'pokemon_50',
      ],
      family: ['PackPartnerDataService:getPackInventory', 'mainnet'],
      staleTime: PACK_PARTNER_INVENTORY_STALE_TIME,
    });
  });

  it('describes the Greatest Hits read by environment', () => {
    const descriptor = packPartnerQueries.getGreatestHits('devnet');

    expect(descriptor).toEqual({
      queryKey: ['PackPartnerDataService:getGreatestHits', 'devnet'],
      family: ['PackPartnerDataService:getGreatestHits', 'devnet'],
      staleTime: PACK_PARTNER_GREATEST_HITS_STALE_TIME,
    });
  });

  it('scopes the owned-cards read to one environment and one public address', () => {
    const descriptor = packPartnerQueries.getOwnedCards('mainnet', ADDRESS);

    expect(descriptor).toEqual({
      queryKey: ['PackPartnerDataService:getOwnedCards', 'mainnet', ADDRESS],
      family: ['PackPartnerDataService:getOwnedCards', 'mainnet', ADDRESS],
      staleTime: PACK_PARTNER_OWNED_CARDS_STALE_TIME,
    });
  });

  it('scopes the buyback offer read to one environment and one mint', () => {
    const descriptor = packPartnerQueries.getBuybackOffer('mainnet', MINT);

    expect(descriptor).toEqual({
      queryKey: ['PackPartnerDataService:getBuybackOffer', 'mainnet', MINT],
      family: ['PackPartnerDataService:getBuybackOffer', 'mainnet', MINT],
      staleTime: PACK_PARTNER_BUYBACK_OFFER_STALE_TIME,
    });
  });

  it('describes a recent openings read whose family covers every pack feed of the environment', () => {
    const descriptor = packPartnerQueries.getRecentOpenings('mainnet', {
      packType: 'pokemon_50',
    });

    expect(descriptor).toEqual({
      queryKey: [
        'PackPartnerDataService:getRecentOpenings',
        'mainnet',
        { packType: 'pokemon_50' },
      ],
      family: ['PackPartnerDataService:getRecentOpenings', 'mainnet'],
      staleTime: PACK_PARTNER_RECENT_OPENINGS_STALE_TIME,
    });
  });

  it('keys the feed of every pack with an empty pack code', () => {
    const descriptor = packPartnerQueries.getRecentOpenings('mainnet', {});

    expect(descriptor.queryKey).toEqual([
      'PackPartnerDataService:getRecentOpenings',
      'mainnet',
      {},
    ]);
  });

  it('keeps every family a prefix of its query key', () => {
    const descriptors = [
      packPartnerQueries.getPacks('mainnet'),
      packPartnerQueries.getPackInventory('mainnet', 'pokemon_50'),
      packPartnerQueries.getGreatestHits('mainnet'),
      packPartnerQueries.getOwnedCards('mainnet', ADDRESS),
      packPartnerQueries.getBuybackOffer('mainnet', MINT),
      packPartnerQueries.getRecentOpenings('mainnet', {
        packType: 'pokemon_50',
      }),
    ];

    const prefixes = descriptors.map(({ queryKey, family }) =>
      queryKey.slice(0, family.length),
    );

    expect(prefixes).toEqual(descriptors.map(({ family }) => [...family]));
  });

  it('never shares a key between environments', () => {
    const mainnet = packPartnerQueries.getOwnedCards('mainnet', ADDRESS);
    const devnet = packPartnerQueries.getOwnedCards('devnet', ADDRESS);

    expect(mainnet.queryKey).not.toEqual(devnet.queryKey);
    expect(mainnet.family).not.toEqual(devnet.family);
  });
});

describe('packPartnerQueryFamilies', () => {
  it('refreshes only the owned cards of the account after an opening', () => {
    const families = packPartnerQueryFamilies.opened('mainnet', ADDRESS);

    expect(families).toEqual([
      ['PackPartnerDataService:getOwnedCards', 'mainnet', ADDRESS],
    ]);
  });

  it('refreshes the owned cards of the account and the offer of the card after a sale', () => {
    const families = packPartnerQueryFamilies.sold('mainnet', ADDRESS, MINT);

    expect(families).toEqual([
      ['PackPartnerDataService:getOwnedCards', 'mainnet', ADDRESS],
      ['PackPartnerDataService:getBuybackOffer', 'mainnet', MINT],
    ]);
  });

  it('refreshes only the offer of the card when the offer changed', () => {
    const families = packPartnerQueryFamilies.offerChanged('mainnet', MINT);

    expect(families).toEqual([
      ['PackPartnerDataService:getBuybackOffer', 'mainnet', MINT],
    ]);
  });
});
