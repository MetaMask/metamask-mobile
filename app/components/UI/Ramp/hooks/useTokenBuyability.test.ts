import { renderHook } from '@testing-library/react-native';
// eslint-disable-next-line import-x/no-namespace
import * as tokenBuyabilityModule from './useTokenBuyability';
import { useRampsTokens } from './useRampsTokens';
import { RampsToken } from './useRampTokens';
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

  const getMockRampToken = (
    overrides: Partial<RampsToken> = {},
  ): RampsToken => ({
    name: 'Mock Token',
    symbol: 'MOCK',
    decimals: 18,
    iconUrl: 'https://example.com/icon.png',
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
    chainId: 'eip155:1',
    tokenSupported: false,
    ...overrides,
  });

  const setupControllerTokens = (
    allTokens: RampsToken[] | null,
    isLoading = false,
  ): void => {
    mockUseRampsTokens.mockReturnValue({
      tokens: allTokens ? { topTokens: [], allTokens } : null,
      selectedToken: null,
      setSelectedToken: jest.fn(),
      isLoading,
      error: null,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockParseRampIntent.mockReturnValue({
      assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    });
    setupControllerTokens(null);
  });

  describe('useTokensBuyability', () => {
    it('maps buyability for multiple tokens by token key', () => {
      const firstToken = getMockToken({
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      });
      const secondToken = getMockToken({
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      });

      setupControllerTokens([
        getMockRampToken({
          assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
          tokenSupported: true,
        }),
        getMockRampToken({
          assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          tokenSupported: false,
        }),
      ]);

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
      setupControllerTokens(null, true);

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
      setupControllerTokens([
        getMockRampToken({
          assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
          tokenSupported: true,
        }),
      ]);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([caipToken]),
      );

      expect(result.current.buyabilityByTokenKey).toEqual({
        [tokenBuyabilityModule.getTokenBuyabilityKey(caipToken)]: true,
      });
      expect(mockParseRampIntent).not.toHaveBeenCalled();
    });

    it('returns false when mockParseRampIntent parsing throws', () => {
      mockParseRampIntent.mockImplementation(() => {
        throw new Error('parse failed');
      });
      setupControllerTokens([
        getMockRampToken({
          assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
          tokenSupported: true,
        }),
      ]);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([getMockToken()]),
      );

      expect(result.current.buyabilityByTokenKey).toEqual({
        [tokenBuyabilityModule.getTokenBuyabilityKey(getMockToken())]: false,
      });
    });

    it('returns false for native token when chainId differs', () => {
      const nativeToken = getMockToken({ isNative: true, chainId: '0x1' });
      setupControllerTokens([
        getMockRampToken({
          assetId: 'eip155:10/slip44:60',
          chainId: 'eip155:10',
          tokenSupported: true,
        }),
      ]);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([nativeToken]),
      );

      expect(result.current.buyabilityByTokenKey).toEqual({
        [tokenBuyabilityModule.getTokenBuyabilityKey(nativeToken)]: false,
      });
    });

    it('returns false for native token when assetId is not slip44', () => {
      const nativeToken = getMockToken({ isNative: true, chainId: '0x1' });
      setupControllerTokens([
        getMockRampToken({
          assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
          chainId: 'eip155:1',
          tokenSupported: true,
        }),
      ]);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([nativeToken]),
      );

      expect(result.current.buyabilityByTokenKey).toEqual({
        [tokenBuyabilityModule.getTokenBuyabilityKey(nativeToken)]: false,
      });
    });
  });

  describe('useTokenBuyability', () => {
    const testCases = [
      {
        testName: 'token list is null',
        hookReturn: null,
        token: getMockToken(),
        expectedBuyable: false,
      },
      {
        testName: 'token is not in the list',
        hookReturn: [],
        token: getMockToken(),
        expectedBuyable: false,
      },
      {
        testName: 'token is in the list but not supported',
        hookReturn: [
          getMockRampToken({
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            chainId: 'eip155:1',
            tokenSupported: false,
          }),
        ],
        token: getMockToken(),
        expectedBuyable: false,
      },
      {
        testName: 'token is in the list and supported',
        hookReturn: [
          getMockRampToken({
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            chainId: 'eip155:1',
            tokenSupported: true,
          }),
        ],
        token: getMockToken(),
        expectedBuyable: true,
      },
      {
        testName: 'token is native and supported',
        hookReturn: [
          getMockRampToken({
            assetId: 'eip155:1/slip44:60',
            chainId: 'eip155:1',
            tokenSupported: true,
          }),
        ],
        token: getMockToken({ isNative: true }),
        expectedBuyable: true,
      },
    ];

    it.each(testCases)(
      '$testName - returns isBuyable: $expectedBuyable',
      ({ hookReturn, token, expectedBuyable }) => {
        setupControllerTokens(hookReturn);

        const { result } = renderHook(() =>
          tokenBuyabilityModule.useTokenBuyability(token),
        );

        expect(result.current.isBuyable).toBe(expectedBuyable);
        expect(result.current.isLoading).toBe(false);
      },
    );

    it('returns isBuyable: false when controller tokens are null', () => {
      setupControllerTokens(null);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(false);
    });

    it('returns isBuyable: true when token is in controller token list (checksummed)', () => {
      setupControllerTokens([
        getMockRampToken({
          assetId: 'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F',
          chainId: 'eip155:1',
          tokenSupported: true,
        }),
      ]);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(true);
    });

    it('returns isBuyable: false when token is NOT in controller token list', () => {
      setupControllerTokens([
        getMockRampToken({
          assetId: 'eip155:1/erc20:0xSomeOtherToken',
          chainId: 'eip155:1',
          tokenSupported: true,
        }),
      ]);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(false);
    });

    it('returns isLoading: true when controller tokens are loading', () => {
      setupControllerTokens(null, true);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('ignores ramp entries without assetId', () => {
      setupControllerTokens([getMockRampToken({ assetId: '' })]);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(false);
    });
  });

  describe('single token wrapper contract', () => {
    it('returns the same result as batch buyability for one token', () => {
      const token = getMockToken();
      setupControllerTokens([
        getMockRampToken({
          assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
          tokenSupported: true,
        }),
      ]);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(token),
      );
      const { result: batchResult } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([token]),
      );

      const tokenKey = tokenBuyabilityModule.getTokenBuyabilityKey(token);
      expect(result.current.isBuyable).toBe(
        batchResult.current.buyabilityByTokenKey[tokenKey] ?? false,
      );
      expect(result.current.isLoading).toBe(batchResult.current.isLoading);
    });
  });
});
