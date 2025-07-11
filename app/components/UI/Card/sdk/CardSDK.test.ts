import { ethers } from 'ethers';
import { CardSDK } from './CardSDK';
import {
  CardFeatureFlag,
  SupportedToken,
} from '../../../../selectors/featureFlagController/card';
import { CardToken } from '../types';
import Logger from '../../../../util/Logger';
import {
  BALANCE_SCANNER_ABI,
  BALANCE_SCANNER_CONTRACT_ADDRESS,
  FOXCONNECT_GLOBAL_ADDRESS,
  FOXCONNECT_US_ADDRESS,
  ON_RAMP_API_URL,
} from '../constants';

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
  });

  describe('supportedTokensAddresses', () => {
    it('should return valid token addresses', () => {
      const addresses = cardSDK.supportedTokensAddresses;
      expect(addresses).toHaveLength(2);
      expect(addresses).toContain(mockSupportedTokens[0].address);
      expect(addresses).toContain(mockSupportedTokens[1].address);
    });

    it('should filter out invalid addresses', () => {
      (ethers.utils.isAddress as jest.Mock).mockImplementation(
        (address: string) => address === mockSupportedTokens[0].address,
      );

      const addresses = cardSDK.supportedTokensAddresses;
      expect(addresses).toHaveLength(1);
      expect(addresses).toContain(mockSupportedTokens[0].address);
    });
  });

  describe('ethersProvier', () => {
    it('should create JsonRpcProvider with correct URL', () => {
      // Access the provider to trigger the getter
      expect(cardSDK.ethersProvider).toBeDefined();
      expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledWith(
        expect.stringContaining('linea-mainnet'),
      );
    });
  });

  describe('balanceScannerInstance', () => {
    it('should create contract with correct parameters', () => {
      // Access the contract to trigger the getter
      expect(cardSDK.balanceScannerInstance).toBeDefined();
      expect(ethers.Contract).toHaveBeenCalledWith(
        BALANCE_SCANNER_CONTRACT_ADDRESS,
        BALANCE_SCANNER_ABI,
        mockProvider,
      );
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
        cardSDK.supportedTokensAddresses,
        expect.arrayContaining([
          [FOXCONNECT_GLOBAL_ADDRESS, FOXCONNECT_US_ADDRESS],
          [FOXCONNECT_GLOBAL_ADDRESS, FOXCONNECT_US_ADDRESS],
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
        new URL('geolocation', ON_RAMP_API_URL),
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
