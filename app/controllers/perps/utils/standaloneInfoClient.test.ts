import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import type { ClearinghouseStateResponse } from '../types/hyperliquid-types';
import {
  createStandaloneInfoClient,
  queryStandaloneClearinghouseStates,
} from './standaloneInfoClient';

// Mock instances — must use 'mock' prefix for Jest hoisting
const mockHttpTransportInstance = { url: 'http://mock' };
const mockInfoClientInstance = {
  clearinghouseState: jest.fn(),
};

jest.mock('@nktkas/hyperliquid', () => ({
  HttpTransport: jest.fn(() => mockHttpTransportInstance),
  InfoClient: jest.fn(() => mockInfoClientInstance),
}));

// After jest.mock hoisting, these imports are the mocked constructors
const MockedHttpTransport = HttpTransport as unknown as jest.Mock;
const MockedInfoClient = InfoClient as unknown as jest.Mock;

/**
 * Factory for mock ClearinghouseStateResponse.
 * Returns a minimal valid shape; callers can spread overrides.
 */
const createMockClearinghouseResponse = (
  overrides: Partial<ClearinghouseStateResponse> = {},
): ClearinghouseStateResponse =>
  ({
    marginSummary: {
      totalMarginUsed: '0',
      accountValue: '1000',
    },
    withdrawable: '1000',
    assetPositions: [],
    ...overrides,
  }) as ClearinghouseStateResponse;

describe('standaloneInfoClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // createStandaloneInfoClient
  // ----------------------------------------------------------------
  describe('createStandaloneInfoClient', () => {
    it('creates HttpTransport with mainnet config and default timeout', () => {
      createStandaloneInfoClient({ isTestnet: false });

      expect(MockedHttpTransport).toHaveBeenCalledWith({
        isTestnet: false,
        timeout: 10_000,
      });
    });

    it('creates HttpTransport with testnet config', () => {
      createStandaloneInfoClient({ isTestnet: true });

      expect(MockedHttpTransport).toHaveBeenCalledWith({
        isTestnet: true,
        timeout: 10_000,
      });
    });

    it('creates HttpTransport with custom timeout', () => {
      createStandaloneInfoClient({ isTestnet: false, timeout: 5000 });

      expect(MockedHttpTransport).toHaveBeenCalledWith({
        isTestnet: false,
        timeout: 5000,
      });
    });

    it('passes HttpTransport instance to InfoClient', () => {
      createStandaloneInfoClient({ isTestnet: false });

      expect(MockedInfoClient).toHaveBeenCalledWith({
        transport: mockHttpTransportInstance,
      });
    });

    it('returns the InfoClient instance', () => {
      const result = createStandaloneInfoClient({ isTestnet: false });

      expect(result).toBe(mockInfoClientInstance);
    });
  });

  // ----------------------------------------------------------------
  // queryStandaloneClearinghouseStates
  // ----------------------------------------------------------------
  describe('queryStandaloneClearinghouseStates', () => {
    const userAddress = '0xABCDEF1234567890abcdef1234567890ABCDEF12';

    let mockInfoClient: jest.Mocked<Pick<InfoClient, 'clearinghouseState'>>;

    beforeEach(() => {
      mockInfoClient = {
        clearinghouseState: jest.fn(),
      };
    });

    it('calls clearinghouseState for each DEX in the list', async () => {
      const dexs: (string | null)[] = [null, 'xyz', 'abc'];
      mockInfoClient.clearinghouseState.mockResolvedValue(
        createMockClearinghouseResponse(),
      );

      await queryStandaloneClearinghouseStates(
        mockInfoClient as unknown as InfoClient,
        userAddress,
        dexs,
      );

      expect(mockInfoClient.clearinghouseState).toHaveBeenCalledTimes(3);
    });

    it('passes user address without dex param for null DEX entries', async () => {
      mockInfoClient.clearinghouseState.mockResolvedValue(
        createMockClearinghouseResponse(),
      );

      await queryStandaloneClearinghouseStates(
        mockInfoClient as unknown as InfoClient,
        userAddress,
        [null],
      );

      expect(mockInfoClient.clearinghouseState).toHaveBeenCalledWith({
        user: userAddress,
      });
    });

    it('passes user address with dex param for non-null DEX entries', async () => {
      mockInfoClient.clearinghouseState.mockResolvedValue(
        createMockClearinghouseResponse(),
      );

      await queryStandaloneClearinghouseStates(
        mockInfoClient as unknown as InfoClient,
        userAddress,
        ['xyz'],
      );

      expect(mockInfoClient.clearinghouseState).toHaveBeenCalledWith({
        user: userAddress,
        dex: 'xyz',
      });
    });

    it('returns all clearinghouseState responses in order', async () => {
      const responseA = createMockClearinghouseResponse({
        withdrawable: '100',
      });
      const responseB = createMockClearinghouseResponse({
        withdrawable: '200',
      });
      const responseC = createMockClearinghouseResponse({
        withdrawable: '300',
      });

      mockInfoClient.clearinghouseState
        .mockResolvedValueOnce(responseA)
        .mockResolvedValueOnce(responseB)
        .mockResolvedValueOnce(responseC);

      const results = await queryStandaloneClearinghouseStates(
        mockInfoClient as unknown as InfoClient,
        userAddress,
        [null, 'xyz', 'abc'],
      );

      expect(results).toEqual([responseA, responseB, responseC]);
    });

    it('returns single response for main-DEX-only list', async () => {
      const response = createMockClearinghouseResponse();
      mockInfoClient.clearinghouseState.mockResolvedValue(response);

      const results = await queryStandaloneClearinghouseStates(
        mockInfoClient as unknown as InfoClient,
        userAddress,
        [null],
      );

      expect(mockInfoClient.clearinghouseState).toHaveBeenCalledTimes(1);
      expect(results).toEqual([response]);
    });

    it('returns empty array for empty DEX list', async () => {
      const results = await queryStandaloneClearinghouseStates(
        mockInfoClient as unknown as InfoClient,
        userAddress,
        [],
      );

      expect(mockInfoClient.clearinghouseState).not.toHaveBeenCalled();
      expect(results).toEqual([]);
    });

    it('propagates error when clearinghouseState rejects', async () => {
      const networkError = new Error('Network timeout');
      mockInfoClient.clearinghouseState.mockRejectedValue(networkError);

      await expect(
        queryStandaloneClearinghouseStates(
          mockInfoClient as unknown as InfoClient,
          userAddress,
          [null],
        ),
      ).rejects.toThrow('Network timeout');
    });
  });
});
