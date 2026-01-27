import { renderHook } from '@testing-library/react-native';
import { useAssetBuyability } from './useAssetBuyability';
import { TokenI } from '../../Tokens/types';

// Mock dependencies
jest.mock('../../Ramp/hooks/useRampTokens', () => ({
  useRampTokens: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useAssetMetadata/utils', () => ({
  toAssetId: jest.fn(
    (address: string, chainId: string) =>
      `${chainId}/erc20:${address.toLowerCase()}`,
  ),
}));

jest.mock('@metamask/multichain-network-controller', () => ({
  toEvmCaipChainId: jest.fn((chainId: string) => `eip155:${parseInt(chainId)}`),
}));

jest.mock('../../Ramp/Aggregator/utils/parseCaip19AssetId', () => ({
  parseCAIP19AssetId: jest.fn((assetId: string) => {
    if (assetId.includes('slip44')) {
      return { assetNamespace: 'slip44' };
    }
    return { assetNamespace: 'erc20' };
  }),
}));

jest.mock('../../../../util/general', () => ({
  toLowerCaseEquals: jest.fn(
    (a: string, b: string) => a?.toLowerCase() === b?.toLowerCase(),
  ),
}));

import { useRampTokens } from '../../Ramp/hooks/useRampTokens';

const mockUseRampTokens = useRampTokens as jest.MockedFunction<
  typeof useRampTokens
>;

describe('useAssetBuyability', () => {
  const mockToken: TokenI = {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    chainId: '0x1',
    balance: '100',
    balanceFiat: '$100',
    image: '',
    logo: '',
    aggregators: [],
    isETH: false,
    isNative: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when allTokens is null', () => {
    it('returns isAssetBuyable as false', () => {
      mockUseRampTokens.mockReturnValue({
        allTokens: null,
      } as ReturnType<typeof useRampTokens>);

      const { result } = renderHook(() => useAssetBuyability(mockToken));

      expect(result.current.isAssetBuyable).toBe(false);
    });
  });

  describe('when allTokens is empty array', () => {
    it('returns isAssetBuyable as false', () => {
      mockUseRampTokens.mockReturnValue({
        allTokens: [],
      } as unknown as ReturnType<typeof useRampTokens>);

      const { result } = renderHook(() => useAssetBuyability(mockToken));

      expect(result.current.isAssetBuyable).toBe(false);
    });
  });

  describe('when token is found and supported', () => {
    it('returns isAssetBuyable as true', () => {
      mockUseRampTokens.mockReturnValue({
        allTokens: [
          {
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            chainId: 'eip155:1',
            tokenSupported: true,
          },
        ],
      } as unknown as ReturnType<typeof useRampTokens>);

      const { result } = renderHook(() => useAssetBuyability(mockToken));

      expect(result.current.isAssetBuyable).toBe(true);
    });
  });

  describe('when token is found but not supported', () => {
    it('returns isAssetBuyable as false', () => {
      mockUseRampTokens.mockReturnValue({
        allTokens: [
          {
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            chainId: 'eip155:1',
            tokenSupported: false,
          },
        ],
      } as unknown as ReturnType<typeof useRampTokens>);

      const { result } = renderHook(() => useAssetBuyability(mockToken));

      expect(result.current.isAssetBuyable).toBe(false);
    });
  });

  describe('when token is not found in allTokens', () => {
    it('returns isAssetBuyable as false', () => {
      mockUseRampTokens.mockReturnValue({
        allTokens: [
          {
            assetId: 'eip155:1/erc20:0xdifferentaddress',
            chainId: 'eip155:1',
            tokenSupported: true,
          },
        ],
      } as unknown as ReturnType<typeof useRampTokens>);

      const { result } = renderHook(() => useAssetBuyability(mockToken));

      expect(result.current.isAssetBuyable).toBe(false);
    });
  });

  describe('native token handling', () => {
    it('matches native token by slip44 namespace', () => {
      const nativeToken: TokenI = {
        ...mockToken,
        address: '',
        isNative: true,
        symbol: 'ETH',
      };

      mockUseRampTokens.mockReturnValue({
        allTokens: [
          {
            assetId: 'eip155:1/slip44:60',
            chainId: 'eip155:1',
            tokenSupported: true,
          },
        ],
      } as unknown as ReturnType<typeof useRampTokens>);

      const { result } = renderHook(() => useAssetBuyability(nativeToken));

      expect(result.current.isAssetBuyable).toBe(true);
    });
  });

  describe('token without assetId', () => {
    it('returns isAssetBuyable as false when token has no assetId', () => {
      mockUseRampTokens.mockReturnValue({
        allTokens: [
          {
            assetId: null,
            chainId: 'eip155:1',
            tokenSupported: true,
          },
        ],
      } as unknown as ReturnType<typeof useRampTokens>);

      const { result } = renderHook(() => useAssetBuyability(mockToken));

      expect(result.current.isAssetBuyable).toBe(false);
    });
  });

  describe('CAIP chain ID handling', () => {
    it('handles already CAIP formatted chainId', () => {
      const caipToken: TokenI = {
        ...mockToken,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      };

      mockUseRampTokens.mockReturnValue({
        allTokens: [
          {
            assetId: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/erc20:${mockToken.address.toLowerCase()}`,
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            tokenSupported: true,
          },
        ],
      } as unknown as ReturnType<typeof useRampTokens>);

      const { result } = renderHook(() => useAssetBuyability(caipToken));

      expect(result.current.isAssetBuyable).toBe(true);
    });
  });
});
