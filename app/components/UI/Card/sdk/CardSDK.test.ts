import { ethers } from 'ethers';
import { CardSDK } from './CardSDK';
import {
  CardFeatureFlag,
  SupportedToken,
} from '../../../../selectors/featureFlagController/card';
import { CardToken } from '../types';
import Logger from '../../../../util/Logger';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getLogs: jest.fn(),
      })),
    },
    Contract: jest.fn().mockImplementation(() => ({
      spendersAllowancesForTokens: jest.fn(),
    })),
    utils: {
      isAddress: jest.fn(),
      Interface: jest.fn().mockImplementation(() => ({
        getEventTopic: jest.fn(),
        parseLog: jest.fn(),
      })),
      hexZeroPad: jest.fn(),
    },
    BigNumber: {
      from: jest.fn().mockImplementation((value) => ({
        isZero: jest.fn().mockReturnValue(value === '0'),
        toString: () => value,
      })),
    },
  },
}));

// Mock Logger
jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

// Mock network utilities
jest.mock('../../../../util/networks', () => ({
  getDecimalChainId: jest.fn().mockReturnValue('59144'),
}));

// Mock fetch for geolocation API
global.fetch = jest.fn();

describe('CardSDK', () => {
  let cardSDK: CardSDK;
  let mockCardFeatureFlag: CardFeatureFlag;
  let mockProvider: jest.Mocked<ethers.providers.JsonRpcProvider>;
  let mockContract: jest.Mocked<ethers.Contract>;

  const mockSupportedTokens: SupportedToken[] = [
    {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
    {
      address: '0x0987654321098765432109876543210987654321',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockCardFeatureFlag = {
      'eip155:59144': {
        enabled: true,
        balanceScannerAddress: '0xed9f04f2da1b42ae558d5e688fe2ef7080931c9a',
        foxConnectAddresses: {
          global: '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
          us: '0xA90b298d05C2667dDC64e2A4e17111357c215dD2',
        },
        onRampApi: 'https://on-ramp.uat-api.cx.metamask.io',
        tokens: mockSupportedTokens,
      },
    };

    mockProvider = {
      getLogs: jest.fn(),
    } as unknown as jest.Mocked<ethers.providers.JsonRpcProvider>;

    mockContract = {
      spendersAllowancesForTokens: jest.fn(),
    } as unknown as jest.Mocked<ethers.Contract>;

    (ethers.providers.JsonRpcProvider as unknown as jest.Mock).mockReturnValue(
      mockProvider,
    );
    (ethers.Contract as unknown as jest.Mock).mockReturnValue(mockContract);
    (ethers.utils.isAddress as jest.Mock).mockReturnValue(true);
    (ethers.utils.hexZeroPad as jest.Mock).mockImplementation((value, length) =>
      value.padStart(length * 2, '0'),
    );

    cardSDK = new CardSDK({
      cardFeatureFlag: mockCardFeatureFlag,
      rawChainId: '0xe708',
    });
  });

  describe('constructor', () => {
    it('should initialize with correct card feature flag and chain ID', () => {
      expect(cardSDK.isCardEnabled).toBe(true);
      expect(cardSDK.supportedTokens).toEqual(mockSupportedTokens);
    });
  });

  describe('isCardEnabled', () => {
    it('should return true when card is enabled for the chain', () => {
      expect(cardSDK.isCardEnabled).toBe(true);
    });

    it('should return false when card is disabled for the chain', () => {
      const disabledCardFeatureFlag: CardFeatureFlag = {
        'eip155:59144': {
          enabled: false,
          tokens: [],
        },
      };

      const disabledCardholderSDK = new CardSDK({
        cardFeatureFlag: disabledCardFeatureFlag,
        rawChainId: '0xe708',
      });

      expect(disabledCardholderSDK.isCardEnabled).toBe(false);
    });

    it('should return false when chain is not configured', () => {
      const emptyCardFeatureFlag: CardFeatureFlag = {};

      const noChainCardholderSDK = new CardSDK({
        cardFeatureFlag: emptyCardFeatureFlag,
        rawChainId: '0xe708',
      });

      expect(noChainCardholderSDK.isCardEnabled).toBe(false);
    });
  });

  describe('supportedTokens', () => {
    it('should return supported tokens when card is enabled', () => {
      expect(cardSDK.supportedTokens).toEqual(mockSupportedTokens);
    });

    it('should return empty array when card is disabled', () => {
      const disabledCardFeatureFlag: CardFeatureFlag = {
        'eip155:59144': {
          enabled: false,
          tokens: mockSupportedTokens,
        },
      };

      const disabledCardholderSDK = new CardSDK({
        cardFeatureFlag: disabledCardFeatureFlag,
        rawChainId: '0xe708',
      });

      expect(disabledCardholderSDK.supportedTokens).toEqual([]);
    });

    it('should return empty array when tokens array is undefined', () => {
      const noTokensCardFeatureFlag: CardFeatureFlag = {
        'eip155:59144': {
          enabled: true,
          // tokens property is undefined
        },
      };

      const noTokensCardSDK = new CardSDK({
        cardFeatureFlag: noTokensCardFeatureFlag,
        rawChainId: '0xe708',
      });

      expect(noTokensCardSDK.supportedTokens).toEqual([]);
    });
  });

  describe('error handling for private getters', () => {
    it('should throw error when foxConnectAddresses are missing', async () => {
      const missingFoxConnectFeatureFlag: CardFeatureFlag = {
        'eip155:59144': {
          enabled: true,
          tokens: mockSupportedTokens,
          // foxConnectAddresses is missing
        },
      };

      const missingFoxConnectSDK = new CardSDK({
        cardFeatureFlag: missingFoxConnectFeatureFlag,
        rawChainId: '0xe708',
      });

      const testAddress = '0x1234567890123456789012345678901234567890';

      // This should handle the error gracefully and return false
      const result = await missingFoxConnectSDK.isCardHolder(testAddress);
      expect(result).toBe(false);
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should throw error when balanceScannerAddress is missing', async () => {
      const missingBalanceScannerFeatureFlag: CardFeatureFlag = {
        'eip155:59144': {
          enabled: true,
          tokens: mockSupportedTokens,
          foxConnectAddresses: {
            global: '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
            us: '0xA90b298d05C2667dDC64e2A4e17111357c215dD2',
          },
          // balanceScannerAddress is missing
        },
      };

      const missingBalanceScannerSDK = new CardSDK({
        cardFeatureFlag: missingBalanceScannerFeatureFlag,
        rawChainId: '0xe708',
      });

      const testAddress = '0x1234567890123456789012345678901234567890';

      // This should handle the error gracefully and return false
      const result = await missingBalanceScannerSDK.isCardHolder(testAddress);
      expect(result).toBe(false);
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('supportedTokensAddresses', () => {
    it('should return valid token addresses', () => {
      const addresses = cardSDK.supportedTokens;
      expect(addresses).toHaveLength(2);
      expect(addresses[0].address).toBe(mockSupportedTokens[0].address);
      expect(addresses[1].address).toBe(mockSupportedTokens[1].address);
    });

    it('should filter out invalid addresses', () => {
      (ethers.utils.isAddress as jest.Mock).mockImplementation(
        (address: string) => address === mockSupportedTokens[0].address,
      );

      const addresses = cardSDK.supportedTokens;
      expect(addresses).toHaveLength(1);
      expect(addresses[0].address).toBe(mockSupportedTokens[0].address);
    });
  });

  describe('isCardHolder', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';

    it('should return false when card is not enabled', async () => {
      const disabledCardFeatureFlag: CardFeatureFlag = {
        'eip155:59144': {
          enabled: false,
          tokens: [],
        },
      };

      const disabledCardholderSDK = new CardSDK({
        cardFeatureFlag: disabledCardFeatureFlag,
        rawChainId: '0xe708',
      });

      const result = await disabledCardholderSDK.isCardHolder(testAddress);
      expect(result).toBe(false);
    });

    it('should return true when address has non-zero allowances', async () => {
      mockContract.spendersAllowancesForTokens.mockResolvedValue([
        [
          [true, '1000'],
          [true, '0'],
        ],
        [
          [true, '0'],
          [true, '500'],
        ],
      ]);

      const result = await cardSDK.isCardHolder(testAddress);
      expect(result).toBe(true);

      expect(mockContract.spendersAllowancesForTokens).toHaveBeenCalledWith(
        testAddress,
        cardSDK.supportedTokens.map((token) => token.address as `0x${string}`),
        expect.arrayContaining([
          [
            mockCardFeatureFlag['eip155:59144']?.foxConnectAddresses?.global,
            mockCardFeatureFlag['eip155:59144']?.foxConnectAddresses?.us,
          ],
          [
            mockCardFeatureFlag['eip155:59144']?.foxConnectAddresses?.global,
            mockCardFeatureFlag['eip155:59144']?.foxConnectAddresses?.us,
          ],
        ]),
      );
    });

    it('should return false when address has zero allowances', async () => {
      mockContract.spendersAllowancesForTokens.mockResolvedValue([
        [
          [true, '0'],
          [true, '0'],
        ],
        [
          [true, '0'],
          [true, '0'],
        ],
      ]);

      const result = await cardSDK.isCardHolder(testAddress);
      expect(result).toBe(false);
    });

    it('should handle contract call errors and return false', async () => {
      const error = new Error('Contract call failed');
      mockContract.spendersAllowancesForTokens.mockRejectedValue(error);

      const result = await cardSDK.isCardHolder(testAddress);
      expect(result).toBe(false);
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'Failed to check if address is a card holder',
      );
    });
  });

  describe('getGeoLocation', () => {
    it('should return geolocation on successful API call', async () => {
      const mockGeolocation = 'US';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(mockGeolocation),
      });

      const result = await cardSDK.getGeoLocation();
      expect(result).toBe(mockGeolocation);
      expect(global.fetch).toHaveBeenCalledWith(
        new URL(
          'geolocation',
          mockCardFeatureFlag['eip155:59144']?.onRampApi || '',
        ),
      );
    });

    it('should handle API errors and return empty string', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const result = await cardSDK.getGeoLocation();
      expect(result).toBe('');
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should handle network errors and return empty string', async () => {
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(error);

      const result = await cardSDK.getGeoLocation();
      expect(result).toBe('');
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'Failed to get geolocation',
      );
    });
  });

  describe('getSupportedTokensAllowances', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';

    it('should throw error when card is not enabled', async () => {
      const disabledCardFeatureFlag: CardFeatureFlag = {
        'eip155:59144': {
          enabled: false,
          tokens: [],
        },
      };

      const disabledCardholderSDK = new CardSDK({
        cardFeatureFlag: disabledCardFeatureFlag,
        rawChainId: '0xe708',
      });

      await expect(
        disabledCardholderSDK.getSupportedTokensAllowances(testAddress),
      ).rejects.toThrow('Card feature is not enabled for this chain');
    });

    it('should return empty array when no supported tokens', async () => {
      const emptyTokensCardFeatureFlag: CardFeatureFlag = {
        'eip155:59144': {
          enabled: true,
          tokens: [],
          balanceScannerAddress: '0xed9f04f2da1b42ae558d5e688fe2ef7080931c9a',
          foxConnectAddresses: {
            global: '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
            us: '0xA90b298d05C2667dDC64e2A4e17111357c215dD2',
          },
        },
      };

      const emptyTokensCardSDK = new CardSDK({
        cardFeatureFlag: emptyTokensCardFeatureFlag,
        rawChainId: '0xe708',
      });

      const result = await emptyTokensCardSDK.getSupportedTokensAllowances(
        testAddress,
      );
      expect(result).toEqual([]);
    });

    it('should return token allowances correctly', async () => {
      mockContract.spendersAllowancesForTokens.mockResolvedValue([
        [
          [true, '1000'],
          [true, '500'],
        ],
        [
          [true, '2000'],
          [true, '1500'],
        ],
      ]);

      const result = await cardSDK.getSupportedTokensAllowances(testAddress);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        address: mockSupportedTokens[0].address,
        usAllowance: expect.any(Object),
        globalAllowance: expect.any(Object),
      });
      expect(result[1]).toEqual({
        address: mockSupportedTokens[1].address,
        usAllowance: expect.any(Object),
        globalAllowance: expect.any(Object),
      });
    });
  });

  describe('getPriorityToken', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';
    const nonZeroBalanceTokens = [mockSupportedTokens[0].address as string];

    it('should throw error when card is not enabled', async () => {
      const disabledCardFeatureFlag: CardFeatureFlag = {
        'eip155:59144': {
          enabled: false,
          tokens: [],
        },
      };

      const disabledCardholderSDK = new CardSDK({
        cardFeatureFlag: disabledCardFeatureFlag,
        rawChainId: '0xe708',
      });

      await expect(
        disabledCardholderSDK.getPriorityToken(
          testAddress,
          nonZeroBalanceTokens,
        ),
      ).rejects.toThrow('Card feature is not enabled for this chain');
    });

    it('should return the matching token when only one token has non-zero balance', async () => {
      const result = await cardSDK.getPriorityToken(
        testAddress,
        nonZeroBalanceTokens,
      );

      expect(result).toEqual({
        address: mockSupportedTokens[0].address,
        decimals: mockSupportedTokens[0].decimals,
        symbol: mockSupportedTokens[0].symbol,
        name: mockSupportedTokens[0].name,
      });
    });

    it('should return null when token is not found in supported tokens', async () => {
      const unknownTokenAddress = '0xunknown1234567890123456789012345678901234';
      const result = await cardSDK.getPriorityToken(testAddress, [
        unknownTokenAddress,
      ]);

      expect(result).toBeNull();
    });

    it('should analyze approval logs when multiple tokens have non-zero balances', async () => {
      const multipleTokens = [
        mockSupportedTokens[0].address as string,
        mockSupportedTokens[1].address as string,
      ];

      const mockInterface = {
        getEventTopic: jest.fn().mockReturnValue('0xapprovalTopic'),
        parseLog: jest.fn().mockReturnValue({
          args: {
            value: { isZero: () => false },
          },
        }),
      };

      (ethers.utils.Interface as unknown as jest.Mock).mockReturnValue(
        mockInterface,
      );

      // Mock getLogs to return different results for each call
      let callCount = 0;
      mockProvider.getLogs.mockImplementation(() => {
        if (callCount === 0) {
          // First call for token 0 (USDC) - return log at block 200 (more recent)
          callCount++;
          return Promise.resolve([
            {
              blockNumber: 200,
              logIndex: 1,
              blockHash: '0x789',
              transactionIndex: 0,
              removed: false,
              address: mockSupportedTokens[0].address as string,
              data: '0x',
              topics: [],
              transactionHash: '0xabc',
            },
          ]);
        }
        // Second call for token 1 (USDT) - return log at block 100 (older)
        return Promise.resolve([
          {
            blockNumber: 100,
            logIndex: 1,
            blockHash: '0x123',
            transactionIndex: 0,
            removed: false,
            address: mockSupportedTokens[1].address as string,
            data: '0x',
            topics: [],
            transactionHash: '0x456',
          },
        ]);
      });

      const result = await cardSDK.getPriorityToken(
        testAddress,
        multipleTokens,
      );

      expect(result).toEqual({
        address: mockSupportedTokens[0].address,
        decimals: mockSupportedTokens[0].decimals,
        symbol: mockSupportedTokens[0].symbol,
        name: mockSupportedTokens[0].name,
      });
    });

    it('should return first supported token when no approval logs are found', async () => {
      const multipleTokens = [
        mockSupportedTokens[0].address as string,
        mockSupportedTokens[1].address as string,
      ];

      mockProvider.getLogs.mockResolvedValue([]);

      const result = await cardSDK.getPriorityToken(
        testAddress,
        multipleTokens,
      );

      expect(result).toEqual({
        address: mockSupportedTokens[0].address,
        decimals: mockSupportedTokens[0].decimals,
        symbol: mockSupportedTokens[0].symbol,
        name: mockSupportedTokens[0].name,
      });
    });

    it('should return null when no supported tokens and no logs', async () => {
      const emptyCardFeatureFlag: CardFeatureFlag = {
        'eip155:59144': {
          enabled: true,
          tokens: [],
        },
      };

      const emptyCardholderSDK = new CardSDK({
        cardFeatureFlag: emptyCardFeatureFlag,
        rawChainId: '0xe708',
      });

      mockProvider.getLogs.mockResolvedValue([]);

      const result = await emptyCardholderSDK.getPriorityToken(testAddress, []);

      expect(result).toBeNull();
    });
  });

  describe('mapSupportedTokenToCardToken', () => {
    it('should correctly map SupportedToken to CardToken', () => {
      const supportedToken = mockSupportedTokens[0];

      // Access the private method through bracket notation
      const cardToken = (
        cardSDK as unknown as {
          mapSupportedTokenToCardToken: (token: SupportedToken) => CardToken;
        }
      ).mapSupportedTokenToCardToken(supportedToken);

      expect(cardToken).toEqual({
        address: supportedToken.address,
        decimals: supportedToken.decimals,
        symbol: supportedToken.symbol,
        name: supportedToken.name,
      });
    });
  });
});
