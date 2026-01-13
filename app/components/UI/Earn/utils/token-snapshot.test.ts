import { Hex } from '@metamask/utils';
import {
  fetchTokenSnapshot,
  getTokenSnapshotFromState,
  getEarnTokenPairAddressesFromState,
} from './token-snapshot';

const mockFetchTokenDisplayData = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    TokenSearchDiscoveryDataController: {
      fetchTokenDisplayData: (...args: unknown[]) =>
        mockFetchTokenDisplayData(...args),
    },
  },
  state: {
    TokenSearchDiscoveryDataController: {
      tokenDisplayData: [
        {
          found: true,
          chainId: '0x1' as Hex,
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          currency: 'USD',
          token: {
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          },
        },
        {
          found: false,
          chainId: '0x1' as Hex,
          address: '0x0000000000000000000000000000000000000000',
          currency: 'USD',
        },
      ],
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

const mockGetState = jest.fn();
jest.mock('../../../../store', () => ({
  store: {
    getState: () => mockGetState(),
  },
}));

jest.mock('../../../../util/networks', () => ({
  getDecimalChainId: (chainId: string) => {
    const chainIdMap: Record<string, number> = {
      '0x1': 1,
      '0x89': 137,
    };
    return chainIdMap[chainId] || 1;
  },
}));

describe('token-snapshot utils', () => {
  const CHAIN_ID = '0x1' as Hex;
  const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex;
  const UNKNOWN_ADDRESS = '0x1111111111111111111111111111111111111111' as Hex;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchTokenSnapshot', () => {
    it('calls TokenSearchDiscoveryDataController.fetchTokenDisplayData', async () => {
      mockFetchTokenDisplayData.mockResolvedValueOnce(undefined);

      await fetchTokenSnapshot(CHAIN_ID, USDC_ADDRESS);

      expect(mockFetchTokenDisplayData).toHaveBeenCalledWith(
        CHAIN_ID,
        USDC_ADDRESS,
      );
    });

    it('throws error if fetch fails', async () => {
      const error = new Error('Fetch failed');
      mockFetchTokenDisplayData.mockRejectedValueOnce(error);

      await expect(fetchTokenSnapshot(CHAIN_ID, USDC_ADDRESS)).rejects.toThrow(
        'Fetch failed',
      );
    });
  });

  describe('getTokenSnapshotFromState', () => {
    it('returns token snapshot when found in state', () => {
      const result = getTokenSnapshotFromState(CHAIN_ID, USDC_ADDRESS);

      expect(result).toEqual({
        chainId: CHAIN_ID,
        address: USDC_ADDRESS,
        token: {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          address: USDC_ADDRESS,
        },
      });
    });

    it('returns null when token not found in state', () => {
      const result = getTokenSnapshotFromState(CHAIN_ID, UNKNOWN_ADDRESS);

      expect(result).toBeNull();
    });

    it('handles case-insensitive address matching', () => {
      const lowercaseAddress =
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex;

      const result = getTokenSnapshotFromState(CHAIN_ID, lowercaseAddress);

      expect(result).not.toBeNull();
      expect(result?.token.symbol).toBe('USDC');
    });

    it('returns null when entry has found: false', () => {
      const zeroAddress = '0x0000000000000000000000000000000000000000' as Hex;

      const result = getTokenSnapshotFromState(CHAIN_ID, zeroAddress);

      expect(result).toBeNull();
    });
  });

  describe('getEarnTokenPairAddressesFromState', () => {
    const UNDERLYING_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const OUTPUT_TOKEN_ADDRESS = '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c';

    const createMockState = (markets: unknown[] = []) => ({
      engine: {
        backgroundState: {
          EarnController: {
            lending: {
              markets,
            },
          },
        },
      },
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns token pair when matching by underlying address', () => {
      mockGetState.mockReturnValue(
        createMockState([
          {
            chainId: 1,
            underlying: { address: UNDERLYING_ADDRESS },
            outputToken: { address: OUTPUT_TOKEN_ADDRESS },
          },
        ]),
      );

      const result = getEarnTokenPairAddressesFromState(
        CHAIN_ID,
        UNDERLYING_ADDRESS,
      );

      expect(result).toEqual({
        earnToken: UNDERLYING_ADDRESS,
        outputToken: OUTPUT_TOKEN_ADDRESS,
      });
    });

    it('returns token pair when matching by output token address', () => {
      mockGetState.mockReturnValue(
        createMockState([
          {
            chainId: 1,
            underlying: { address: UNDERLYING_ADDRESS },
            outputToken: { address: OUTPUT_TOKEN_ADDRESS },
          },
        ]),
      );

      const result = getEarnTokenPairAddressesFromState(
        CHAIN_ID,
        OUTPUT_TOKEN_ADDRESS,
      );

      expect(result).toEqual({
        earnToken: UNDERLYING_ADDRESS,
        outputToken: OUTPUT_TOKEN_ADDRESS,
      });
    });

    it('handles case-insensitive address matching', () => {
      mockGetState.mockReturnValue(
        createMockState([
          {
            chainId: 1,
            underlying: { address: UNDERLYING_ADDRESS },
            outputToken: { address: OUTPUT_TOKEN_ADDRESS },
          },
        ]),
      );

      const result = getEarnTokenPairAddressesFromState(
        CHAIN_ID,
        UNDERLYING_ADDRESS.toLowerCase(),
      );

      expect(result.earnToken).toBe(UNDERLYING_ADDRESS);
      expect(result.outputToken).toBe(OUTPUT_TOKEN_ADDRESS);
    });

    it('returns empty object when no matching market found', () => {
      mockGetState.mockReturnValue(
        createMockState([
          {
            chainId: 1,
            underlying: { address: UNDERLYING_ADDRESS },
            outputToken: { address: OUTPUT_TOKEN_ADDRESS },
          },
        ]),
      );

      const result = getEarnTokenPairAddressesFromState(
        CHAIN_ID,
        '0x1111111111111111111111111111111111111111',
      );

      expect(result).toEqual({
        earnToken: undefined,
        outputToken: undefined,
      });
    });

    it('returns empty object when markets array is empty', () => {
      mockGetState.mockReturnValue(createMockState([]));

      const result = getEarnTokenPairAddressesFromState(
        CHAIN_ID,
        UNDERLYING_ADDRESS,
      );

      expect(result).toEqual({
        earnToken: undefined,
        outputToken: undefined,
      });
    });

    it('filters by chain ID correctly', () => {
      mockGetState.mockReturnValue(
        createMockState([
          {
            chainId: 137, // Polygon, not matching 0x1 (Ethereum)
            underlying: { address: UNDERLYING_ADDRESS },
            outputToken: { address: OUTPUT_TOKEN_ADDRESS },
          },
        ]),
      );

      const result = getEarnTokenPairAddressesFromState(
        CHAIN_ID,
        UNDERLYING_ADDRESS,
      );

      expect(result).toEqual({
        earnToken: undefined,
        outputToken: undefined,
      });
    });
  });
});
