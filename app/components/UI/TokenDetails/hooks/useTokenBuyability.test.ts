import { renderHook } from '@testing-library/react-native';
import { useTokenBuyability } from './useTokenBuyability';
import {
  useRampTokens,
  UseRampTokensResult,
} from '../../Ramp/hooks/useRampTokens';
import { useRampsTokens } from '../../Ramp/hooks/useRampsTokens';
import useRampsUnifiedV2Enabled from '../../Ramp/hooks/useRampsUnifiedV2Enabled';
import { TokenI } from '../../Tokens/types';

jest.mock('../../Ramp/hooks/useRampTokens', () => ({
  useRampTokens: jest.fn(),
}));

jest.mock('../../Ramp/hooks/useRampsTokens', () => ({
  useRampsTokens: jest.fn(),
}));

jest.mock('../../Ramp/hooks/useRampsUnifiedV2Enabled', () => jest.fn());

const mockUseRampTokens = jest.mocked(useRampTokens);
const mockUseRampsTokens = jest.mocked(useRampsTokens);
const mockUseRampsUnifiedV2Enabled = jest.mocked(useRampsUnifiedV2Enabled);

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
    setupV1Mocks();
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

      const { result } = renderHook(() => useTokenBuyability(getMockToken()));

      expect(result.current.isBuyable).toBe(false);
    });

    it('returns isBuyable: true when token is in controller token list (checksummed)', () => {
      // V2 uses parseRampIntent which checksums the address
      mockUseRampsTokens.mockReturnValue({
        tokens: {
          topTokens: [],
          allTokens: [
            {
              assetId:
                'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F',
              chainId: 'eip155:1',
              tokenSupported: true,
            },
          ],
        },
        selectedToken: null,
        setSelectedToken: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenBuyability(getMockToken()));

      expect(result.current.isBuyable).toBe(true);
    });

    it('returns isBuyable: false when token is NOT in controller token list', () => {
      mockUseRampsTokens.mockReturnValue({
        tokens: {
          topTokens: [],
          allTokens: [
            {
              assetId: 'eip155:1/erc20:0xSomeOtherToken',
              chainId: 'eip155:1',
              tokenSupported: true,
            },
          ],
        },
        selectedToken: null,
        setSelectedToken: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenBuyability(getMockToken()));

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

      const { result } = renderHook(() => useTokenBuyability(getMockToken()));

      expect(result.current.isBuyable).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('uses controller tokens instead of legacy tokens', () => {
      mockUseRampTokens.mockReturnValue({
        allTokens: [
          {
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            chainId: 'eip155:1',
            tokenSupported: true,
          },
        ],
        isLoading: false,
      } as UseRampTokensResult);

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

      const { result } = renderHook(() => useTokenBuyability(getMockToken()));

      // V2 enabled: should use controller tokens (empty) not legacy tokens
      expect(result.current.isBuyable).toBe(false);
    });
  });
});
