import {
  buildSocialPositionOpenGraph,
  buildSocialProfileOpenGraph,
  readTraderShareName,
} from './socialShareOpenGraph';

describe('readTraderShareName', () => {
  it('prefers the public display name over the username', () => {
    expect(
      readTraderShareName(
        { name: 'wen_silent_gecko', displayName: 'The OG Swiss Cheese' },
        'wen_silent_gecko',
      ),
    ).toBe('The OG Swiss Cheese');
  });

  it('falls back to the username, then the screen label', () => {
    expect(readTraderShareName({ name: 'dip_spicy_maxi' })).toBe(
      'dip_spicy_maxi',
    );
    expect(readTraderShareName(undefined, 'Ada')).toBe('Ada');
  });
});

describe('buildSocialProfileOpenGraph', () => {
  it('names the trader in a short title and description', () => {
    expect(buildSocialProfileOpenGraph('Giga Whale')).toEqual({
      title: 'Giga Whale on MetaMask',
      description: 'Trades and posts from Giga Whale',
    });
  });

  it('returns nothing when the trader name is missing', () => {
    expect(buildSocialProfileOpenGraph('   ')).toBeUndefined();
    expect(buildSocialProfileOpenGraph(undefined)).toBeUndefined();
  });

  it('clips a long trader name on a word boundary', () => {
    expect(
      buildSocialProfileOpenGraph('Supercalifragilistic Expialidocious Whale'),
    ).toEqual({
      title: 'Supercalifragilistic on MetaMask',
      description: 'Trades and posts from Supercalifragilistic',
    });
  });
});

describe('buildSocialPositionOpenGraph', () => {
  it('names an open spot trade and its asset', () => {
    expect(
      buildSocialPositionOpenGraph({
        traderName: 'trader1',
        assetSymbol: 'PEPE',
      }),
    ).toEqual({
      title: "trader1's PEPE trade",
      description: 'trader1 is trading PEPE',
    });
  });

  it('names a closed short', () => {
    expect(
      buildSocialPositionOpenGraph({
        traderName: 'Ada',
        assetSymbol: 'ETH',
        side: 'short',
        isClosed: true,
      }),
    ).toEqual({
      title: "Ada's ETH trade",
      description: 'Ada closed their ETH short',
    });
  });

  it('names an open long', () => {
    expect(
      buildSocialPositionOpenGraph({
        traderName: 'Wen Cat',
        assetSymbol: 'BTC',
        side: 'long',
      }),
    ).toEqual({
      title: "Wen Cat's BTC trade",
      description: 'Wen Cat is long BTC',
    });
  });

  it('still names the trader when the asset is missing', () => {
    expect(
      buildSocialPositionOpenGraph({
        traderName: 'alpha.eth',
      }),
    ).toEqual({
      title: "alpha.eth's trade",
      description: 'A trade from alpha.eth',
    });
  });
});
