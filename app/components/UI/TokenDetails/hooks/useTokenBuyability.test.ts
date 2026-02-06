import { renderHook } from '@testing-library/react-native';
import { useTokenBuyability } from './useTokenBuyability';
import {
  useRampTokens,
  UseRampTokensResult,
} from '../../Ramp/hooks/useRampTokens';
import { TokenI } from '../../Tokens/types';

jest.mock('../../Ramp/hooks/useRampTokens', () => ({
  useRampTokens: jest.fn(),
}));

const mockUseRampTokens = jest.mocked(useRampTokens);

describe('useTokenBuyability', () => {
  const getMockToken = (overrides: Partial<TokenI> = {}): TokenI =>
    ({
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      chainId: '0x1',
      ...overrides,
    }) as TokenI;

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
        {
          address: '0x6b175474e89094c44da98b954eedeac495271d0f',
          chainId: 'eip155:1',
          tokenSupported: false,
        },
      ],
      token: getMockToken(),
      expectedBuyable: false,
    },
    {
      testName: 'token is in the list and supported',
      hookReturn: [
        {
          assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
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

      const { result } = renderHook(() => useTokenBuyability(token));

      expect(result.current.isBuyable).toBe(expectedBuyable);
      expect(result.current.isLoading).toBe(false);
    },
  );

  it('returns isLoading: true when ramp tokens are loading', () => {
    mockUseRampTokens.mockReturnValue({
      allTokens: null,
      isLoading: true,
    } as UseRampTokensResult);

    const { result } = renderHook(() => useTokenBuyability(getMockToken()));

    expect(result.current.isBuyable).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});
