import { Hex } from '@metamask/utils';
import {
  fetchTokenSnapshot,
  getTokenSnapshotFromState,
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
});
