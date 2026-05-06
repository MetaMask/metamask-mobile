import { getRelatedAssetImageSource } from './getRelatedAssetImageSource';

// Mock image requires as numbers (React Native bundler assigns numbers to require() results)
jest.mock('../../../../images/image-icons', () => ({
  __esModule: true,
  default: {
    BTC: 100,
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
  describe('CAIP-19 path (highest priority — regular crypto tokens)', () => {
    it('uses bundled icon when symbol matches image-icons', () => {
      const result = getRelatedAssetImageSource({
        name: 'Ethereum',
        symbol: 'ETH',
        caip19: ['eip155:1/slip44:60'],
        sourceAssetId: 'ethereum',
        hlPerpsMarket: ['ETH'], // present but must NOT trigger Perps SVG path
      });

      expect(result).toBe(123);
      expect(typeof result).toBe('number'); // bundled PNG, not an SVG URI object
    });

    it('ignores hlPerpsMarket when caip19 is populated', () => {
      // BTC has hlPerpsMarket but also has caip19 — must use CAIP-19 path
      const result = getRelatedAssetImageSource({
        name: 'Bitcoin',
        symbol: 'BTC',
        caip19: ['bip122:000000000019d6689c085ae165831e93/slip44:0'],
        sourceAssetId: 'bitcoin',
        hlPerpsMarket: ['BTC'],
      });

      // Bundled BTC icon, not a Perps SVG URI
      expect(result).toBe(100);
      expect(typeof result).toBe('number');
    });

    it('returns wallet CDN URI when symbol has no bundled icon', () => {
      const result = getRelatedAssetImageSource({
        name: 'Some Token',
        symbol: 'UNKNOWN',
        caip19: ['eip155:1/erc20:0xABCDEF'],
        sourceAssetId: 'some-token',
      });

      expect(result).toEqual({
        uri: expect.stringContaining('static.cx.metamask.io'),
      });
    });
  });

  describe('Perps path via hlPerpsMarket (only when caip19 is empty)', () => {
    it('uses Perps primary SVG for a plain HL market id', () => {
      // Hypothetical BTC with no caip19 (purely Perps context)
      const result = getRelatedAssetImageSource({
        name: 'Bitcoin',
        symbol: 'BTC',
        caip19: [],
        sourceAssetId: 'bitcoin',
        hlPerpsMarket: ['BTC'],
      });

      expect(result).toEqual({ uri: `${PERPS_ICONS_BASE}BTC.svg` });
    });

    it('uses Perps primary SVG for HIP-3 synthetic asset (xyz:TSLA format)', () => {
      const result = getRelatedAssetImageSource({
        name: 'Tesla',
        symbol: 'TSLA',
        caip19: [],
        sourceAssetId: 'tsla',
        hlPerpsMarket: ['xyz:TSLA'],
      });

      expect(result).toEqual({
        uri: `${PERPS_ICONS_BASE}hip3:xyz_TSLA.svg`,
      });
    });

    it('skips Perps path when caip19 is populated even if hlPerpsMarket is set', () => {
      const result = getRelatedAssetImageSource({
        name: 'Ethereum',
        symbol: 'ETH',
        caip19: ['eip155:1/slip44:60'],
        sourceAssetId: 'ethereum',
        hlPerpsMarket: ['ETH'],
      });

      // Must be bundled PNG, not SVG URI
      expect(typeof result).toBe('number');
    });
  });

  describe('symbol-only fallback', () => {
    it('returns bundled icon by symbol when caip19 is empty and no hlPerpsMarket', () => {
      const result = getRelatedAssetImageSource({
        name: 'Ethereum',
        symbol: 'ETH',
        caip19: [],
        sourceAssetId: 'ethereum',
      });

      expect(result).toBe(123);
    });

    it('returns undefined when no caip19, no hlPerpsMarket, and unknown symbol', () => {
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
