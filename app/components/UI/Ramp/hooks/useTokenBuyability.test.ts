import { renderHook } from '@testing-library/react-native';
// eslint-disable-next-line import-x/no-namespace
import * as tokenBuyabilityModule from './useTokenBuyability';
import { useRampsTokens } from './useRampsTokens';
import { TokenI } from '../../Tokens/types';
import parseRampIntent from '../utils/parseRampIntent';

jest.mock('./useRampsTokens', () => ({
  useRampsTokens: jest.fn(),
}));
jest.mock('../utils/parseRampIntent', () => jest.fn());

const mockUseRampsTokens = jest.mocked(useRampsTokens);
const mockParseRampIntent = jest.mocked(parseRampIntent);

describe('useTokenBuyability', () => {
  const getMockToken = (overrides: Partial<TokenI> = {}): TokenI => ({
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    chainId: '0x1',
    image: '',
    logo: undefined,
    balance: '0',
    isETH: false,
    isNative: false,
    ...overrides,
  });

  const getMockRampToken = (overrides = {}) => ({
    name: 'Mock Token',
    symbol: 'MOCK',
    decimals: 18,
    iconUrl: 'https://example.com/icon.png',
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
    chainId: 'eip155:1',
    tokenSupported: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockParseRampIntent.mockReturnValue({
      assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    });
    mockUseRampsTokens.mockReturnValue({
      tokens: null,
      selectedToken: null,
      setSelectedToken: jest.fn(),
      isLoading: false,
      error: null,
    });
  });

  describe('useTokensBuyability', () => {
    it('maps buyability for multiple tokens by token key', () => {
      const firstToken = getMockToken({
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      });
      const secondToken = getMockToken({
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      });
      mockUseRampsTokens.mockReturnValue({
        tokens: {
          topTokens: [],
          allTokens: [
            getMockRampToken({
              assetId:
                'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
              tokenSupported: true,
            }),
            getMockRampToken({
              assetId:
                'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              tokenSupported: false,
            }),
          ],
        },
        selectedToken: null,
        setSelectedToken: jest.fn(),
        isLoading: false,
        error: null,
      });
      mockParseRampIntent.mockImplementation(({ address }) => ({
        assetId: `eip155:1/erc20:${address?.toLowerCase()}`,
      }));

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([firstToken, secondToken]),
      );

      expect(result.current.buyabilityByTokenKey).toEqual({
        [tokenBuyabilityModule.getTokenBuyabilityKey(firstToken)]: true,
        [tokenBuyabilityModule.getTokenBuyabilityKey(secondToken)]: false,
      });
    });

    it('returns loading from controller tokens', () => {
      mockUseRampsTokens.mockReturnValue({
        tokens: null,
        selectedToken: null,
        setSelectedToken: jest.fn(),
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([getMockToken()]),
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('does not call parseRampIntent when token address is already a CAIP asset type', () => {
      const caipToken = getMockToken({
        address: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
        chainId: 'eip155:1',
      });
      mockUseRampsTokens.mockReturnValue({
        tokens: {
          topTokens: [],
          allTokens: [
            getMockRampToken({
              assetId:
                'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
              tokenSupported: true,
            }),
          ],
        },
        selectedToken: null,
        setSelectedToken: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([caipToken]),
      );

      expect(result.current.buyabilityByTokenKey).toEqual({
        [tokenBuyabilityModule.getTokenBuyabilityKey(caipToken)]: true,
      });
      expect(mockParseRampIntent).not.toHaveBeenCalled();
    });
  });

  describe('useTokenBuyability', () => {
    it('returns isBuyable true when token is in controller token list', () => {
      mockUseRampsTokens.mockReturnValue({
        tokens: {
          topTokens: [],
          allTokens: [
            getMockRampToken({
              assetId:
                'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F',
              tokenSupported: true,
            }),
          ],
        },
        selectedToken: null,
        setSelectedToken: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(true);
    });

    it('returns false when controller tokens are null', () => {
      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(false);
    });

    it('returns true for supported native token on matching chain', () => {
      const nativeToken = getMockToken({ isNative: true, chainId: '0x1' });
      mockUseRampsTokens.mockReturnValue({
        tokens: {
          topTokens: [],
          allTokens: [
            getMockRampToken({
              assetId: 'eip155:1/slip44:60',
              chainId: 'eip155:1',
              tokenSupported: true,
            }),
          ],
        },
        selectedToken: null,
        setSelectedToken: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(nativeToken),
      );

      expect(result.current.isBuyable).toBe(true);
    });
  });
});
