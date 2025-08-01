import { ethers } from 'ethers';
import { CardSDK } from './CardSDK';
import {
  CardFeatureFlag,
  SupportedToken,
} from '../../../../selectors/featureFlagController/card/index';
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
  log: jest.fn(),
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

  const mockTestAddress = 'eip155:0:0x1234567890123456789012345678901234567890';

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
      constants: {
        onRampApiUrl: 'https://on-ramp.uat-api.cx.metamask.io',
        accountsApiUrl: 'https://accounts.api.cx.metamask.io',
      },
      chains: {
        'eip155:59144': {
          enabled: true,
          balanceScannerAddress: '0xed9f04f2da1b42ae558d5e688fe2ef7080931c9a',
          foxConnectAddresses: {
            global: '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
            us: '0xA90b298d05C2667dDC64e2A4e17111357c215dD2',
          },
          tokens: mockSupportedTokens,
        },
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
        constants: {
          accountsApiUrl: 'https://accounts.api.cx.metamask.io',
        },
        chains: {
          'eip155:59144': {
            enabled: false,
            tokens: [],
          },
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
        constants: {
          accountsApiUrl: 'https://accounts.api.cx.metamask.io',
        },
        chains: {
          'eip155:59144': {
            enabled: false,
            tokens: mockSupportedTokens,
          },
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
        constants: {
          accountsApiUrl: 'https://accounts.api.cx.metamask.io',
        },
        chains: {
          'eip155:59144': {
            enabled: true,
            // tokens property is undefined
          },
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
    it('should handle error when foxConnectAddresses are missing in getSupportedTokensAllowances', async () => {
      const missingFoxConnectFeatureFlag: CardFeatureFlag = {
        constants: {
          accountsApiUrl: 'https://accounts.api.cx.metamask.io',
        },
        chains: {
          'eip155:59144': {
            enabled: true,
            tokens: mockSupportedTokens,
            // foxConnectAddresses is missing
          },
        },
      };

      const missingFoxConnectSDK = new CardSDK({
        cardFeatureFlag: missingFoxConnectFeatureFlag,
        rawChainId: '0xe708',
      });

      // This should throw an error when trying to access foxConnectAddresses
      await expect(
        missingFoxConnectSDK.getSupportedTokensAllowances(
          '0x1234567890123456789012345678901234567890',
        ),
      ).rejects.toThrow(
        'FoxConnect addresses are not defined for the current chain',
      );
    });

    it('should handle error when balanceScannerAddress is missing in getSupportedTokensAllowances', async () => {
      const missingBalanceScannerFeatureFlag: CardFeatureFlag = {
        constants: {
          accountsApiUrl: 'https://accounts.api.cx.metamask.io',
        },
        chains: {
          'eip155:59144': {
            enabled: true,
            tokens: mockSupportedTokens,
            foxConnectAddresses: {
              global: '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
              us: '0xA90b298d05C2667dDC64e2A4e17111357c215dD2',
            },
          },
        },
      };

      const missingBalanceScannerSDK = new CardSDK({
        cardFeatureFlag: missingBalanceScannerFeatureFlag,
        rawChainId: '0xe708',
      });

      // This should throw an error when trying to access balanceScannerAddress
      await expect(
        missingBalanceScannerSDK.getSupportedTokensAllowances(
          '0x1234567890123456789012345678901234567890',
        ),
      ).rejects.toThrow(
        'Balance scanner address is not defined for the current chain',
      );
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
    it('should return empty array when card is not enabled', async () => {
      const disabledCardFeatureFlag: CardFeatureFlag = {
        chains: {
          'eip155:59144': {
            enabled: false,
            tokens: [],
          },
        },
      };

      const disabledCardholderSDK = new CardSDK({
        cardFeatureFlag: disabledCardFeatureFlag,
        rawChainId: '0xe708',
      });

      const result = await disabledCardholderSDK.isCardHolder([
        mockTestAddress,
      ]);
      expect(result).toEqual([]);
    });

    it('should return empty array when no accounts provided', async () => {
      const result = await cardSDK.isCardHolder([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when accounts array is null or undefined', async () => {
      const result = await cardSDK.isCardHolder(
        undefined as unknown as `eip155:${string}:0x${string}`[],
      );
      expect(result).toEqual([]);
    });

    it('should handle single batch (≤50 accounts) correctly', async () => {
      const singleBatchAccounts = Array(30).fill(
        mockTestAddress,
      ) as `eip155:${string}:0x${string}`[];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          is: [mockTestAddress.toLowerCase()],
        }),
      });

      const result = await cardSDK.isCardHolder(singleBatchAccounts);
      expect(result).toEqual([mockTestAddress.toLowerCase()]);

      // Should call fetch only once for single batch
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple batches (up to 150 accounts)', async () => {
      const multiBatchAccounts = Array(100).fill(
        mockTestAddress,
      ) as `eip155:${string}:0x${string}`[];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          is: [mockTestAddress.toLowerCase()],
        }),
      });

      const result = await cardSDK.isCardHolder(multiBatchAccounts);
      expect(result).toEqual([
        mockTestAddress.toLowerCase(),
        mockTestAddress.toLowerCase(),
      ]);

      // Should call fetch twice for 100 accounts (2 batches of 50)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should limit processing to maximum 3 batches (150 accounts)', async () => {
      const manyAccounts = Array(200).fill(
        mockTestAddress,
      ) as `eip155:${string}:0x${string}`[];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          is: [mockTestAddress.toLowerCase()],
        }),
      });

      const result = await cardSDK.isCardHolder(manyAccounts);
      expect(result).toEqual([
        mockTestAddress.toLowerCase(),
        mockTestAddress.toLowerCase(),
        mockTestAddress.toLowerCase(),
      ]);

      // Should call fetch only 3 times maximum, even with 200 accounts
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should return cardholder accounts when API returns accounts in is array', async () => {
      const multipleAccounts = [
        'eip155:59144:0x1111111111111111111111111111111111111111',
        'eip155:59144:0x2222222222222222222222222222222222222222',
      ] as `eip155:${string}:0x${string}`[];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          is: [
            multipleAccounts[0].toLowerCase(),
            multipleAccounts[1].toLowerCase(),
          ],
        }),
      });

      const result = await cardSDK.isCardHolder(multipleAccounts);
      expect(result).toEqual([
        multipleAccounts[0].toLowerCase(),
        multipleAccounts[1].toLowerCase(),
      ]);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('v1/metadata'),
        }),
      );
    });

    it('should return empty array when API returns empty is array', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          is: [],
        }),
      });

      const result = await cardSDK.isCardHolder([mockTestAddress]);
      expect(result).toEqual([]);
    });

    it('should handle API error responses with status code', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await cardSDK.isCardHolder([mockTestAddress]);
      expect(result).toEqual([]);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Failed to check if address is a card holder',
      );
    });

    it('should handle network errors and return empty array', async () => {
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(error);

      const result = await cardSDK.isCardHolder([mockTestAddress]);
      expect(result).toEqual([]);
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'Failed to check if address is a card holder',
      );
    });

    it('should handle missing accountsApiUrl gracefully', async () => {
      const missingAccountsApiFeatureFlag: CardFeatureFlag = {
        chains: {
          'eip155:59144': {
            enabled: true,
            tokens: mockSupportedTokens,
            // accountsApiUrl is missing from constants
          },
        },
      };

      const missingAccountsApiSDK = new CardSDK({
        cardFeatureFlag: missingAccountsApiFeatureFlag,
        rawChainId: '0xe708',
      });

      const result = await missingAccountsApiSDK.isCardHolder([
        mockTestAddress,
      ]);
      expect(result).toEqual([]);
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should construct correct API request with proper parameters', async () => {
      const testAccounts = [
        'eip155:59144:0x1111111111111111111111111111111111111111',
        'eip155:59144:0x2222222222222222222222222222222222222222',
      ] as `eip155:${string}:0x${string}`[];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          is: [],
        }),
      });

      await cardSDK.isCardHolder(testAccounts);

      const expectedUrl = new URL(
        'v1/metadata',
        mockCardFeatureFlag.constants?.accountsApiUrl,
      );
      expectedUrl.searchParams.set(
        'accountIds',
        testAccounts.join(',').toLowerCase(),
      );
      expectedUrl.searchParams.set('label', 'card_user');

      expect(global.fetch).toHaveBeenCalledWith(expectedUrl);
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
          mockCardFeatureFlag.constants?.onRampApiUrl || '',
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
        constants: {
          onRampApiUrl: '',
        },
        chains: {
          'eip155:59144': {
            enabled: false,
            tokens: [],
          },
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
        chains: {
          'eip155:59144': {
            enabled: true,
            tokens: [],
            balanceScannerAddress: '0xed9f04f2da1b42ae558d5e688fe2ef7080931c9a',
            foxConnectAddresses: {
              global: '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
              us: '0xA90b298d05C2667dDC64e2A4e17111357c215dD2',
            },
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
        chains: {
          'eip155:59144': {
            enabled: false,
            tokens: [],
          },
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
        chains: {
          'eip155:59144': {
            enabled: true,
            tokens: [],
          },
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
