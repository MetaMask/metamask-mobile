import {
  buildSocialPositionOpenGraph,
  buildSocialProfileOpenGraph,
  readTraderShareName,
  SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL,
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
  it('names the trader on MetaMask and uses the shared brand image', () => {
    expect(buildSocialProfileOpenGraph('Dip Spicy Maxi')).toEqual({
      title: 'Dip Spicy Maxi on MetaMask',
      description: "See Dip Spicy Maxi's trades on MetaMask",
      imageUrl: SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL,
    });
  });

  it('returns nothing when the trader name is missing', () => {
    expect(buildSocialProfileOpenGraph('   ')).toBeUndefined();
    expect(buildSocialProfileOpenGraph(undefined)).toBeUndefined();
  });
});

describe('buildSocialPositionOpenGraph', () => {
  it('names the trader and the token, with the same copy for every position', () => {
    expect(
      buildSocialPositionOpenGraph({
        traderName: 'The OG Swiss Cheese',
        assetSymbol: 'SNDK',
      }),
    ).toEqual({
      title: "The OG Swiss Cheese's SNDK trade",
      description: 'The OG Swiss Cheese is trading SNDK',
      imageUrl: SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL,
    });
  });

  it('still names the trader when the asset is missing', () => {
    expect(
      buildSocialPositionOpenGraph({ traderName: 'Dip Spicy Maxi' }),
    ).toEqual({
      title: "Dip Spicy Maxi's trade",
      description: "See Dip Spicy Maxi's trades on MetaMask",
      imageUrl: SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL,
    });
  });
});
