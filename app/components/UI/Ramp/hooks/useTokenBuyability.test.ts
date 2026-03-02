import { renderHook } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as tokenBuyabilityModule from './useTokenBuyability';
import {
  useRampTokens,
  UseRampTokensResult,
  RampsToken,
} from './useRampTokens';
import { useRampsTokens } from './useRampsTokens';
import useRampsUnifiedV2Enabled from './useRampsUnifiedV2Enabled';
import { TokenI } from '../../Tokens/types';
import parseRampIntent from '../utils/parseRampIntent';

jest.mock('./useRampTokens', () => ({
  useRampTokens: jest.fn(),
}));

jest.mock('./useRampsTokens', () => ({
  useRampsTokens: jest.fn(),
}));

jest.mock('./useRampsUnifiedV2Enabled', () => jest.fn());
jest.mock('../utils/parseRampIntent', () => jest.fn());

const mockUseRampTokens = jest.mocked(useRampTokens);
const mockUseRampsTokens = jest.mocked(useRampsTokens);
const mockUseRampsUnifiedV2Enabled = jest.mocked(useRampsUnifiedV2Enabled);
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

  const setupV1Mocks = (): void => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
    mockUseRampsTokens.mockReturnValue({
      tokens: null,
      selectedToken: null,
      setSelectedToken: jest.fn(),
      isLoading: false,
      error: null,
    });
  };

  const setupV2Mocks = (): void => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
    mockUseRampTokens.mockReturnValue({
      allTokens: null,
      isLoading: false,
    } as UseRampTokensResult);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockParseRampIntent.mockReturnValue({
      assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    });
    setupV1Mocks();
  });

  describe('useTokensBuyability', () => {
    it('maps buyability for multiple tokens in order', () => {
      const firstToken = getMockToken({
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      });
      const secondToken = getMockToken({
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      });

      mockUseRampTokens.mockReturnValue({
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
        isLoading: false,
      } as UseRampTokensResult);

      mockParseRampIntent.mockImplementation(({ address }) => ({
        assetId: `eip155:1/erc20:${address?.toLowerCase()}`,
      }));

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([firstToken, secondToken]),
      );

      expect(result.current.isBuyableByToken).toEqual([true, false]);
    });

    it('returns loading from controller tokens when v2 is enabled', () => {
      setupV2Mocks();
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
      expect(mockUseRampTokens).toHaveBeenCalledWith({ fetchOnMount: false });
    });

    it('returns loading from legacy tokens when v2 is disabled', () => {
      setupV1Mocks();
      mockUseRampTokens.mockReturnValue({
        allTokens: null,
        isLoading: true,
      } as UseRampTokensResult);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([getMockToken()]),
      );

      expect(result.current.isLoading).toBe(true);
      expect(mockUseRampTokens).toHaveBeenCalledWith({ fetchOnMount: true });
    });

    it('does not call parseRampIntent when token address is already a CAIP asset type', () => {
      const caipToken = getMockToken({
        address: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
        chainId: 'eip155:1',
      });
      mockUseRampTokens.mockReturnValue({
        allTokens: [
          getMockRampToken({
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            tokenSupported: true,
          }),
        ],
        isLoading: false,
      } as UseRampTokensResult);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([caipToken]),
      );

      expect(result.current.isBuyableByToken).toEqual([true]);
      expect(mockParseRampIntent).not.toHaveBeenCalled();
    });

    it('returns false when mockParseRampIntent parsing throws', () => {
      mockParseRampIntent.mockImplementation(() => {
        throw new Error('parse failed');
      });
      mockUseRampTokens.mockReturnValue({
        allTokens: [
          getMockRampToken({
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            tokenSupported: true,
          }),
        ],
        isLoading: false,
      } as UseRampTokensResult);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([getMockToken()]),
      );

      expect(result.current.isBuyableByToken).toEqual([false]);
    });

    it('returns false for native token when chainId differs', () => {
      const nativeToken = getMockToken({ isNative: true, chainId: '0x1' });
      mockUseRampTokens.mockReturnValue({
        allTokens: [
          getMockRampToken({
            assetId: 'eip155:10/slip44:60',
            chainId: 'eip155:10',
            tokenSupported: true,
          }),
        ],
        isLoading: false,
      } as UseRampTokensResult);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([nativeToken]),
      );

      expect(result.current.isBuyableByToken).toEqual([false]);
    });

    it('returns false for native token when assetId is not slip44', () => {
      const nativeToken = getMockToken({ isNative: true, chainId: '0x1' });
      mockUseRampTokens.mockReturnValue({
        allTokens: [
          getMockRampToken({
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            chainId: 'eip155:1',
            tokenSupported: true,
          }),
        ],
        isLoading: false,
      } as UseRampTokensResult);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([nativeToken]),
      );

      expect(result.current.isBuyableByToken).toEqual([false]);
    });
  });

  describe('when V2 is disabled (legacy flow)', () => {
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
          {
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            chainId: 'eip155:1',
            tokenSupported: true,
          },
        ],
        token: getMockToken(),
        expectedBuyable: true,
      },
      {
        testName: 'token is native and supported',
        hookReturn: [
          {
            assetId: 'eip155:1/slip44:60',
            chainId: 'eip155:1',
            tokenSupported: true,
          },
        ],
        token: getMockToken({ isNative: true }),
        expectedBuyable: true,
      },
    ];

    it.each(testCases)(
      '$testName - returns isBuyable: $expectedBuyable',
      ({ hookReturn, token, expectedBuyable }) => {
        mockUseRampTokens.mockReturnValue({
          allTokens: hookReturn,
          isLoading: false,
        } as UseRampTokensResult);

        const { result } = renderHook(() =>
          tokenBuyabilityModule.useTokenBuyability(token),
        );

        expect(result.current.isBuyable).toBe(expectedBuyable);
        expect(result.current.isLoading).toBe(false);
      },
    );

    it('ignores ramp entries without assetId', () => {
      mockUseRampTokens.mockReturnValue({
        allTokens: [getMockRampToken({ assetId: '' })],
        isLoading: false,
      } as UseRampTokensResult);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(false);
    });

    it('returns isLoading: true when ramp tokens are loading', () => {
      mockUseRampTokens.mockReturnValue({
        allTokens: null,
        isLoading: true,
      } as UseRampTokensResult);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('when V2 is enabled', () => {
    beforeEach(() => {
      setupV2Mocks();
    });

    it('returns isBuyable: false when controller tokens are null', () => {
      mockUseRampsTokens.mockReturnValue({
        tokens: null,
        selectedToken: null,
        setSelectedToken: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(false);
    });

    it('returns isBuyable: true when token is in controller token list (checksummed)', () => {
      // V2 uses parseRampIntent which checksums the address
      mockUseRampsTokens.mockReturnValue({
        tokens: {
          topTokens: [],
          allTokens: [
            getMockRampToken({
              assetId:
                'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F',
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
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(true);
    });

    it('returns isBuyable: false when token is NOT in controller token list', () => {
      mockUseRampsTokens.mockReturnValue({
        tokens: {
          topTokens: [],
          allTokens: [
            getMockRampToken({
              assetId: 'eip155:1/erc20:0xSomeOtherToken',
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
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(false);
    });

    it('returns isLoading: true when controller tokens are loading', () => {
      mockUseRampsTokens.mockReturnValue({
        tokens: null,
        selectedToken: null,
        setSelectedToken: jest.fn(),
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      expect(result.current.isBuyable).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('returns isBuyable: false when V2 controller tokens are empty (no fallback)', () => {
      mockUseRampTokens.mockReturnValue({
        allTokens: [
          getMockRampToken({
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            chainId: 'eip155:1',
            tokenSupported: true,
          }),
        ],
        isLoading: false,
      } as unknown as UseRampTokensResult);

      mockUseRampsTokens.mockReturnValue({
        tokens: {
          topTokens: [],
          allTokens: [],
        },
        selectedToken: null,
        setSelectedToken: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      // V2 enabled: uses only V2 controller tokens, no legacy fallback
      expect(result.current.isBuyable).toBe(false);
    });

    it('ignores legacy tokens when V2 is enabled', () => {
      // Legacy says buyable, but V2 controller says NOT buyable
      mockUseRampTokens.mockReturnValue({
        allTokens: [
          getMockRampToken({
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            chainId: 'eip155:1',
            tokenSupported: true,
          }),
        ],
        isLoading: false,
      } as unknown as UseRampTokensResult);

      mockUseRampsTokens.mockReturnValue({
        tokens: {
          topTokens: [],
          allTokens: [
            getMockRampToken({
              assetId: 'eip155:1/erc20:0xSomeOtherToken',
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
        tokenBuyabilityModule.useTokenBuyability(getMockToken()),
      );

      // V2 controller has tokens but NOT this one: not buyable (ignores legacy)
      expect(result.current.isBuyable).toBe(false);
    });
  });

  describe('single token wrapper contract', () => {
    it('returns the same result as batch buyability for one token', () => {
      const token = getMockToken();
      setupV1Mocks();
      mockUseRampTokens.mockReturnValue({
        allTokens: [
          getMockRampToken({
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            tokenSupported: true,
          }),
        ],
        isLoading: false,
      } as UseRampTokensResult);

      const { result } = renderHook(() =>
        tokenBuyabilityModule.useTokenBuyability(token),
      );
      const { result: batchResult } = renderHook(() =>
        tokenBuyabilityModule.useTokensBuyability([token]),
      );

      expect(result.current.isBuyable).toBe(
        batchResult.current.isBuyableByToken[0] ?? false,
      );
      expect(result.current.isLoading).toBe(batchResult.current.isLoading);
    });
  });
});
