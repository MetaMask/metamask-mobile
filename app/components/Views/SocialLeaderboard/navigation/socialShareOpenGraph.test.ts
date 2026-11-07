import {
  buildSocialPositionOpenGraph,
  buildSocialProfileOpenGraph,
  readTraderShareName,
} from './socialShareOpenGraph';

describe('readTraderShareName', () => {
  it('uses the username from the profile', () => {
    expect(
      readTraderShareName({ name: 'wen_silent_gecko' }, 'The OG Swiss Cheese'),
    ).toBe('wen_silent_gecko');
  });

  it('falls back to the screen label', () => {
    expect(readTraderShareName({ name: '  ' }, 'Ada')).toBe('Ada');
    expect(readTraderShareName(undefined, undefined)).toBe('');
  });
});

describe('buildSocialProfileOpenGraph', () => {
  it('asks the reader to follow the trader', () => {
    expect(buildSocialProfileOpenGraph('dip_spicy_maxi')).toEqual({
      title: 'Follow dip_spicy_maxi on MetaMask Social',
      description: 'Trades and posts from dip_spicy_maxi',
    });
  });

  it('returns nothing when the trader name is missing', () => {
    expect(buildSocialProfileOpenGraph('   ')).toBeUndefined();
    expect(buildSocialProfileOpenGraph(undefined)).toBeUndefined();
  });

  it('clips a long trader name on a word boundary', () => {
    expect(
      buildSocialProfileOpenGraph('Supercalifragilistic Expialidocious Whale')
        ?.title,
    ).toBe('Follow Supercalifragilistic on MetaMask Social');
  });
});

describe('buildSocialPositionOpenGraph', () => {
  it.each([
    [{ isClosed: false }, 'trader1 bought PEPE'],
    [{ isClosed: true }, 'trader1 sold PEPE'],
    [{ isPerp: true, side: 'long' as const }, 'trader1 longed PEPE'],
    [
      { isPerp: true, side: 'long' as const, isClosed: true },
      'trader1 longed PEPE',
    ],
    [{ isPerp: true, side: 'short' as const }, 'trader1 shorted PEPE'],
    [{ isPerp: true, side: null }, 'trader1 traded PEPE'],
  ])('titles %o as "%s"', (context, title) => {
    expect(
      buildSocialPositionOpenGraph({
        traderName: 'trader1',
        assetSymbol: 'PEPE',
        ...context,
      }),
    ).toEqual({
      title,
      description: "See trader1's PEPE trade on MetaMask Social",
    });
  });

  it('still names the trader when the asset is missing', () => {
    expect(buildSocialPositionOpenGraph({ traderName: 'alpha.eth' })).toEqual({
      title: 'A trade from alpha.eth',
      description: "See alpha.eth's trade on MetaMask Social",
    });
  });
});
