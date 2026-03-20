import { getRelatedAssetImageSource } from './getRelatedAssetImageSource';

// Mock image requires as numbers (React Native bundler assigns numbers to require() results)
jest.mock('../../../../images/image-icons', () => ({
  __esModule: true,
  default: {
    ETH: 123,
    TRX: 456,
    SOL: 789,
    SVG_ICON: () => null,
    STRING_ICON: 'string-path',
  },
}));

const PERPS_ICONS_BASE =
  'https://raw.githubusercontent.com/MetaMask/metamask-perps-assets/main/icons/';

jest.mock('../../../UI/Perps/utils/marketUtils', () => ({
  getAssetIconUrls: jest.fn((symbol: string) => {
    if (!symbol) return null;
    if (symbol.includes(':')) {
      const [dex, assetSymbol] = symbol.split(':');
      return {
        primary: `${PERPS_ICONS_BASE}hip3:${dex.toLowerCase()}_${assetSymbol.toUpperCase()}.svg`,
        fallback: `${PERPS_ICONS_BASE}${dex.toLowerCase()}:${assetSymbol.toUpperCase()}.svg`,
      };
    }
    return {
      primary: `${PERPS_ICONS_BASE}${symbol.toUpperCase()}.svg`,
      fallback: `${PERPS_ICONS_BASE}${symbol.toUpperCase()}.svg`,
    };
  }),
}));

jest.mock(
  '../../../UI/Perps/components/PerpsTokenLogo/PerpsAssetBgConfig',
  () => ({
    K_PREFIX_ASSETS: new Set(['KPEPE', 'KBONK']),
  }),
);

describe('getRelatedAssetImageSource', () => {
  const baseEthAsset = {
    name: 'Ethereum',
    symbol: 'ETH',
    caip19: ['eip155:1/slip44:60'] as string[],
    sourceAssetId: 'ethereum',
    // hlPerpsMarket is intentionally set to verify it does NOT trigger Perps path
    hlPerpsMarket: 'ETH',
  };

  describe('CAIP-19 path (highest priority for regular crypto tokens)', () => {
    it('uses bundled icon via getTokenImageSource when symbol matches', () => {
      const result = getRelatedAssetImageSource(baseEthAsset);

      // Bundled ETH image (123) takes priority over CDN URL
      expect(result).toBe(123);
    });

    it('ignores hlPerpsMarket even when set — CAIP-19 wins for regular tokens', () => {
      // ETH has hlPerpsMarket: 'ETH' but the Perps SVG path must NOT fire
      // because caip19 is populated and returns a valid source
      const result = getRelatedAssetImageSource(baseEthAsset);

      // Must be the bundled ETH image (a number), not a Perps SVG URI object
      expect(result).toBe(123);
      expect(typeof result).toBe('number');
    });

    it('returns wallet CDN URI when symbol has no bundled icon', () => {
      const result = getRelatedAssetImageSource({
        name: 'Some Token',
        symbol: 'UNKNOWN',
        caip19: ['eip155:1/erc20:0xABCDEF'] as string[],
        sourceAssetId: 'some-token',
      });

      // No bundled icon for UNKNOWN → falls back to CDN URI
      expect(result).toEqual({
        uri: expect.stringContaining('static.cx.metamask.io'),
      });
    });
  });

  describe('Perps path (only for assets with no CAIP-19)', () => {
    it('uses Perps primary URL when perpsAssetId is set and caip19 is empty', () => {
      const result = getRelatedAssetImageSource({
        name: 'Tesla',
        symbol: 'TSLA',
        caip19: [],
        sourceAssetId: 'tsla',
        perpsAssetId: 'xyz:TSLA',
      });

      expect(result).toEqual({
        uri: `${PERPS_ICONS_BASE}hip3:xyz_TSLA.svg`,
      });
    });

    it('uses Perps primary URL for plain perpsAssetId (no colon format)', () => {
      const result = getRelatedAssetImageSource({
        name: 'Bitcoin',
        symbol: 'BTC',
        caip19: [],
        sourceAssetId: 'bitcoin',
        perpsAssetId: 'BTC',
      });

      expect(result).toEqual({ uri: `${PERPS_ICONS_BASE}BTC.svg` });
    });

    it('does NOT use hlPerpsMarket as Perps fallback', () => {
      // Asset with hlPerpsMarket but no caip19 and no perpsAssetId
      // Should NOT trigger the Perps path via hlPerpsMarket
      const result = getRelatedAssetImageSource({
        name: 'Bitcoin',
        symbol: 'BTC',
        caip19: [],
        sourceAssetId: 'bitcoin',
        hlPerpsMarket: 'BTC',
      });

      // hlPerpsMarket is intentionally ignored — no Perps SVG should be returned
      // Falls back to bundled symbol lookup
      expect(result).toBeUndefined(); // no bundled icon for BTC in our mock
    });
  });

  describe('symbol-only fallback', () => {
    it('returns bundled icon by symbol when caip19 is empty and no perpsAssetId', () => {
      const result = getRelatedAssetImageSource({
        ...baseEthAsset,
        caip19: [],
        hlPerpsMarket: undefined,
      });

      // Falls back to bundled ETH by symbol
      expect(result).toBe(123);
    });

    it('returns undefined when no caip19, no perpsAssetId, and unknown symbol', () => {
      const result = getRelatedAssetImageSource({
        name: 'Some Token',
        symbol: 'UNKNOWN',
        caip19: [],
        sourceAssetId: 'some-token',
      });

      expect(result).toBeUndefined();
    });
  });
});
