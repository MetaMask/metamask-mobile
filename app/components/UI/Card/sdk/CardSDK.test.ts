import { ethers } from 'ethers';
import { CardSDK } from './CardSDK';
import {
  CardFeatureFlag,
  SupportedToken,
} from '../../../../selectors/featureFlagController/card/index';
import {
  CardToken,
  CardError,
  CardErrorType,
  CardLoginInitiateResponse,
  CardLoginResponse,
  CardAuthorizeResponse,
  CardExchangeTokenResponse,
} from '../types';
import Logger from '../../../../util/Logger';
import { getCardBaanxToken } from '../util/cardTokenVault';

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

// Mock cardTokenVault
jest.mock('../util/cardTokenVault', () => ({
  getCardBaanxToken: jest.fn(),
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

    // Set up environment variable for API key
    process.env.MM_CARD_BAANX_API_CLIENT_KEY = 'test-api-key';

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

    // Create CardSDK instance AFTER environment variable is set
    cardSDK = new CardSDK({
      cardFeatureFlag: mockCardFeatureFlag,
    });

    // Setup default mock for getCardBaanxToken
    (getCardBaanxToken as jest.Mock).mockResolvedValue({
      success: true,
      tokenData: { accessToken: 'mock-token' },
    });
  });

  describe('constructor', () => {
    it('should initialize with correct card feature flag and chain ID', () => {
      expect(cardSDK.isCardEnabled).toBe(true);
      expect(cardSDK.getSupportedTokensByChainId(cardSDK.lineaChainId)).toEqual(
        mockSupportedTokens,
      );
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
      });

      expect(disabledCardholderSDK.isCardEnabled).toBe(false);
    });

    it('should return false when chain is not configured', () => {
      const emptyCardFeatureFlag: CardFeatureFlag = {};

      const noChainCardholderSDK = new CardSDK({
        cardFeatureFlag: emptyCardFeatureFlag,
      });

      expect(noChainCardholderSDK.isCardEnabled).toBe(false);
    });
  });

  describe('getSupportedTokensByChainId', () => {
    it('should return supported tokens when card is enabled', () => {
      expect(cardSDK.getSupportedTokensByChainId(cardSDK.lineaChainId)).toEqual(
        mockSupportedTokens,
      );
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
      });

      expect(
        disabledCardholderSDK.getSupportedTokensByChainId(
          disabledCardholderSDK.lineaChainId,
        ),
      ).toEqual([]);
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
      });

      expect(
        noTokensCardSDK.getSupportedTokensByChainId(
          noTokensCardSDK.lineaChainId,
        ),
      ).toEqual([]);
    });

    it('should filter out tokens with enabled=false', () => {
      const tokensWithDisabled: SupportedToken[] = [
        mockSupportedTokens[0],
        {
          ...mockSupportedTokens[1],
          enabled: false,
        },
      ];

      const customFeatureFlag: CardFeatureFlag = {
        ...mockCardFeatureFlag,
        chains: {
          'eip155:59144': {
            ...mockCardFeatureFlag.chains?.['eip155:59144'],
            enabled: true,
            tokens: tokensWithDisabled,
          },
        },
      };

      const customSDK = new CardSDK({
        cardFeatureFlag: customFeatureFlag,
      });

      const tokens = customSDK.getSupportedTokensByChainId(
        customSDK.lineaChainId,
      );
      expect(tokens).toHaveLength(1);
      expect(tokens[0].address).toBe(mockSupportedTokens[0].address);
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
      const addresses = cardSDK.getSupportedTokensByChainId(
        cardSDK.lineaChainId,
      );
      expect(addresses).toHaveLength(2);
      expect(addresses[0].address).toBe(mockSupportedTokens[0].address);
      expect(addresses[1].address).toBe(mockSupportedTokens[1].address);
    });

    it('should filter out tokens with invalid addresses', () => {
      const tokensWithInvalid: SupportedToken[] = [
        mockSupportedTokens[0],
        {
          address: undefined as unknown as string,
          symbol: 'INVALID',
          name: 'Invalid Token',
          decimals: 6,
        },
      ];

      const customFeatureFlag: CardFeatureFlag = {
        ...mockCardFeatureFlag,
        chains: {
          'eip155:59144': {
            ...mockCardFeatureFlag.chains?.['eip155:59144'],
            enabled: true,
            tokens: tokensWithInvalid,
          },
        },
      };

      const customSDK = new CardSDK({
        cardFeatureFlag: customFeatureFlag,
      });

      const addresses = customSDK.getSupportedTokensByChainId(
        customSDK.lineaChainId,
      );
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
      expect(Logger.log).toHaveBeenCalledWith(
        expect.any(Error),
        'CardSDK: Failed to check if address is a card holder',
      );
    });

    it('should handle network errors and return empty array', async () => {
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(error);

      const result = await cardSDK.isCardHolder([mockTestAddress]);
      expect(result).toEqual([]);
      expect(Logger.log).toHaveBeenCalledWith(
        error,
        'CardSDK: Failed to check if address is a card holder',
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
      });

      const result = await missingAccountsApiSDK.isCardHolder([
        mockTestAddress,
      ]);
      expect(result).toEqual([]);
      expect(Logger.log).toHaveBeenCalled();
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
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      // Restore original NODE_ENV
      if (originalNodeEnv === undefined) {
        delete (process.env as { NODE_ENV?: string }).NODE_ENV;
      } else {
        (process.env as { NODE_ENV?: string }).NODE_ENV = originalNodeEnv;
      }
      jest.clearAllMocks();
    });

    it('should return UNKNOWN when API call fails', async () => {
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValueOnce(error);

      const result = await cardSDK.getGeoLocation();

      expect(result).toBe('UNKNOWN');
      expect(Logger.log).toHaveBeenCalledWith(
        error,
        'CardSDK: Failed to get geolocation',
      );
    });

    it('should return UNKNOWN when fetch throws an error', async () => {
      const fetchError = new Error('Fetch failed');
      (global.fetch as jest.Mock).mockRejectedValueOnce(fetchError);

      const result = await cardSDK.getGeoLocation();

      expect(result).toBe('UNKNOWN');
      expect(Logger.log).toHaveBeenCalledWith(
        fetchError,
        'CardSDK: Failed to get geolocation',
      );
    });

    it('should return UNKNOWN when response.text() throws an error', async () => {
      const textError = new Error('Failed to read response text');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockRejectedValue(textError),
      });

      const result = await cardSDK.getGeoLocation();

      expect(result).toBe('UNKNOWN');
      expect(Logger.log).toHaveBeenCalledWith(
        textError,
        'CardSDK: Failed to get geolocation',
      );
    });

    it('should handle different country codes correctly', async () => {
      const countryCodes = ['US', 'GB', 'CA', 'DE', 'FR', 'UNKNOWN'];

      for (const code of countryCodes) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(code),
        });

        const result = await cardSDK.getGeoLocation();
        expect(result).toBe(code);
      }
    });

    it('should handle empty string response from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      const result = await cardSDK.getGeoLocation();

      expect(result).toBe('');
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

  describe('initiateCardProviderAuthentication', () => {
    const mockQueryParams = {
      state: 'test-state',
      codeChallenge: 'test-challenge',
    };

    it('should initiate authentication successfully', async () => {
      const mockResponse: CardLoginInitiateResponse = {
        token: 'initiate-token',
        url: 'https://example.com/auth',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.initiateCardProviderAuthentication(
        mockQueryParams,
      );

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/oauth/authorize/initiate'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'omit',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-us-env': 'false',
            'x-client-key': 'test-api-key',
          }),
        }),
      );
    });

    it('should handle server error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal server error'),
      });

      await expect(
        cardSDK.initiateCardProviderAuthentication(mockQueryParams),
      ).rejects.toThrow(CardError);

      await expect(
        cardSDK.initiateCardProviderAuthentication(mockQueryParams),
      ).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Failed to initiate authentication. Please try again.',
      });

      expect(Logger.log).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      const networkError = new Error('Network failure');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      await expect(
        cardSDK.initiateCardProviderAuthentication(mockQueryParams),
      ).rejects.toThrow(CardError);

      await expect(
        cardSDK.initiateCardProviderAuthentication(mockQueryParams),
      ).rejects.toMatchObject({
        type: CardErrorType.NETWORK_ERROR,
        message: 'Network error. Please check your connection.',
      });
    });

    it('should handle timeout error', async () => {
      const timeoutError = new Error('AbortError');
      timeoutError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValue(timeoutError);

      await expect(
        cardSDK.initiateCardProviderAuthentication(mockQueryParams),
      ).rejects.toThrow(CardError);

      await expect(
        cardSDK.initiateCardProviderAuthentication(mockQueryParams),
      ).rejects.toMatchObject({
        type: CardErrorType.TIMEOUT_ERROR,
        message: 'Request timed out. Please check your connection.',
      });
    });

    it('should set x-us-env header to true when userCardLocation is us', async () => {
      const usCardSDK = new CardSDK({
        cardFeatureFlag: mockCardFeatureFlag,
        userCardLocation: 'us',
      });

      const mockResponse: CardLoginInitiateResponse = {
        token: 'initiate-token',
        url: 'https://example.com/auth',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await usCardSDK.initiateCardProviderAuthentication(mockQueryParams);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/oauth/authorize/initiate'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-us-env': 'true',
          }),
        }),
      );
    });
  });

  describe('login', () => {
    const mockLoginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully', async () => {
      const mockResponse: CardLoginResponse = {
        phase: 'verified',
        userId: 'user-123',
        isOtpRequired: false,
        phoneNumber: null,
        accessToken: 'login-token',
        verificationState: 'verified',
        isLinked: true,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.login(mockLoginData);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: mockLoginData.email,
            password: mockLoginData.password,
          }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-us-env': 'false',
            'x-client-key': 'test-api-key',
          }),
        }),
      );
    });

    it('should handle invalid credentials error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      });

      await expect(cardSDK.login(mockLoginData)).rejects.toThrow(CardError);

      await expect(cardSDK.login(mockLoginData)).rejects.toMatchObject({
        type: CardErrorType.INVALID_CREDENTIALS,
        message: 'Invalid login details',
      });
    });

    it('should handle server error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Server error'),
      });

      await expect(cardSDK.login(mockLoginData)).rejects.toThrow(CardError);

      await expect(cardSDK.login(mockLoginData)).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Server error. Please try again later.',
      });
    });

    it('should handle unknown error status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad request'),
      });

      await expect(cardSDK.login(mockLoginData)).rejects.toThrow(CardError);

      await expect(cardSDK.login(mockLoginData)).rejects.toMatchObject({
        type: CardErrorType.UNKNOWN_ERROR,
        message: 'Login failed. Please try again.',
      });
    });
  });

  describe('authorize', () => {
    const mockAuthorizeData = {
      initiateAccessToken: 'initiate-token',
      loginAccessToken: 'login-token',
    };

    it('should authorize successfully', async () => {
      const mockResponse: CardAuthorizeResponse = {
        state: 'auth-state',
        url: 'https://example.com/callback',
        code: 'auth-code-123',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.authorize(mockAuthorizeData);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/oauth/authorize'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            token: mockAuthorizeData.initiateAccessToken,
          }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-us-env': 'false',
            'x-client-key': 'test-api-key',
            Authorization: `Bearer ${mockAuthorizeData.loginAccessToken}`,
          }),
        }),
      );
    });

    it('should handle authorization failure with invalid credentials', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        text: jest.fn().mockResolvedValue('Forbidden'),
      });

      await expect(cardSDK.authorize(mockAuthorizeData)).rejects.toThrow(
        CardError,
      );

      await expect(cardSDK.authorize(mockAuthorizeData)).rejects.toMatchObject({
        type: CardErrorType.INVALID_CREDENTIALS,
        message: 'Authorization failed. Please try logging in again.',
      });
    });

    it('should handle server error during authorization', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Server error'),
      });

      await expect(cardSDK.authorize(mockAuthorizeData)).rejects.toThrow(
        CardError,
      );

      await expect(cardSDK.authorize(mockAuthorizeData)).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Authorization failed. Please try again.',
      });
    });
  });

  describe('exchangeToken', () => {
    const mockAuthCodeExchangeData = {
      code: 'auth-code',
      codeVerifier: 'code-verifier',
      grantType: 'authorization_code' as const,
    };

    const mockRefreshTokenExchangeData = {
      code: 'refresh-token-123',
      grantType: 'refresh_token' as const,
    };

    it('should exchange authorization code successfully', async () => {
      const mockRawResponse = {
        access_token: 'new-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new-refresh-token',
        refresh_token_expires_in: 7200,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockRawResponse),
      });

      const result = await cardSDK.exchangeToken(mockAuthCodeExchangeData);

      const expectedResponse: CardExchangeTokenResponse = {
        accessToken: 'new-access-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'new-refresh-token',
        refreshTokenExpiresIn: 7200,
      };

      expect(result).toEqual(expectedResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/oauth/token'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            code: mockAuthCodeExchangeData.code,
            code_verifier: mockAuthCodeExchangeData.codeVerifier,
            grant_type: mockAuthCodeExchangeData.grantType,
            redirect_uri: 'https://example.com',
          }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-us-env': 'false',
            'x-client-key': 'test-api-key',
            'x-secret-key': 'test-api-key',
          }),
        }),
      );
    });

    it('should exchange refresh token successfully', async () => {
      const mockRawResponse = {
        access_token: 'refreshed-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new-refresh-token',
        refresh_token_expires_in: 7200,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockRawResponse),
      });

      const result = await cardSDK.exchangeToken(mockRefreshTokenExchangeData);

      const expectedResponse: CardExchangeTokenResponse = {
        accessToken: 'refreshed-access-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'new-refresh-token',
        refreshTokenExpiresIn: 7200,
      };

      expect(result).toEqual(expectedResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/oauth/token'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            grant_type: mockRefreshTokenExchangeData.grantType,
            refresh_token: mockRefreshTokenExchangeData.code,
          }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-us-env': 'false',
            'x-client-key': 'test-api-key',
            'x-secret-key': 'test-api-key',
          }),
        }),
      );
    });

    it('should handle token exchange failure with invalid credentials', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Invalid code'),
      });

      await expect(
        cardSDK.exchangeToken(mockAuthCodeExchangeData),
      ).rejects.toThrow(CardError);

      await expect(
        cardSDK.exchangeToken(mockAuthCodeExchangeData),
      ).rejects.toMatchObject({
        type: CardErrorType.INVALID_CREDENTIALS,
        message: 'Token exchange failed. Please try logging in again.',
      });
    });

    it('should handle server error during token exchange', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Server error'),
      });

      await expect(
        cardSDK.exchangeToken(mockAuthCodeExchangeData),
      ).rejects.toThrow(CardError);

      await expect(
        cardSDK.exchangeToken(mockAuthCodeExchangeData),
      ).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Token exchange failed. Please try again.',
      });
    });
  });

  describe('isBaanxLoginEnabled', () => {
    it('should return true when Baanx login is enabled', () => {
      const enabledFeatureFlag: CardFeatureFlag = {
        ...mockCardFeatureFlag,
        isBaanxLoginEnabled: true,
      };

      const enabledSDK = new CardSDK({
        cardFeatureFlag: enabledFeatureFlag,
      });

      expect(enabledSDK.isBaanxLoginEnabled).toBe(true);
    });

    it('should return false when Baanx login is disabled', () => {
      const disabledFeatureFlag: CardFeatureFlag = {
        ...mockCardFeatureFlag,
        isBaanxLoginEnabled: false,
      };

      const disabledSDK = new CardSDK({
        cardFeatureFlag: disabledFeatureFlag,
      });

      expect(disabledSDK.isBaanxLoginEnabled).toBe(false);
    });

    it('should return false when Baanx login flag is undefined', () => {
      const undefinedFeatureFlag: CardFeatureFlag = {
        ...mockCardFeatureFlag,
      };
      delete undefinedFeatureFlag.isBaanxLoginEnabled;

      const undefinedSDK = new CardSDK({
        cardFeatureFlag: undefinedFeatureFlag,
      });

      expect(undefinedSDK.isBaanxLoginEnabled).toBe(false);
    });
  });

  describe('makeRequest error scenarios', () => {
    it('should handle unknown error type', async () => {
      const unknownError = 'string error';
      (global.fetch as jest.Mock).mockRejectedValue(unknownError);

      await expect(
        cardSDK.login({
          email: 'test@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(CardError);

      await expect(
        cardSDK.login({
          email: 'test@example.com',
          password: 'password',
        }),
      ).rejects.toMatchObject({
        type: CardErrorType.UNKNOWN_ERROR,
        message: 'An unexpected error occurred.',
      });
    });
  });

  describe('getCardDetails', () => {
    it('should get card details successfully', async () => {
      const mockCardDetails = {
        id: 'card-123',
        status: 'active',
        last4: '1234',
        expiryMonth: '12',
        expiryYear: '2025',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockCardDetails),
      });

      const result = await cardSDK.getCardDetails();

      expect(result).toEqual(mockCardDetails);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/card/status'),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should throw NO_CARD error when user has no card (404)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(cardSDK.getCardDetails()).rejects.toThrow(CardError);

      await expect(cardSDK.getCardDetails()).rejects.toMatchObject({
        type: CardErrorType.NO_CARD,
        message: 'User has no card. Request a card first.',
      });
    });

    it('should throw SERVER_ERROR for other error statuses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Internal Server Error' }),
      });

      await expect(cardSDK.getCardDetails()).rejects.toThrow(CardError);

      await expect(cardSDK.getCardDetails()).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Failed to get card details. Please try again.',
      });

      expect(Logger.log).toHaveBeenCalled();
    });
  });

  describe('getCardExternalWalletDetails', () => {
    it('should get external wallet details successfully', async () => {
      const mockExternalWalletResponse = [
        {
          address: '0x1234567890123456789012345678901234567890',
          currency: 'USDC',
          balance: '1000.00',
          allowance: '500.00',
          network: 'linea',
        },
        {
          address: '0x0987654321098765432109876543210987654321',
          currency: 'USDT',
          balance: '2000.00',
          allowance: '1000.00',
          network: 'linea',
        },
      ];

      const mockPriorityWalletResponse = [
        {
          id: 1,
          currency: 'USDC',
          network: 'linea',
          priority: 1,
        },
        {
          id: 2,
          currency: 'USDT',
          network: 'linea',
          priority: 2,
        },
      ];

      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue(mockExternalWalletResponse),
          });
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(mockPriorityWalletResponse),
        });
      });

      const result = await cardSDK.getCardExternalWalletDetails();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 1,
        walletAddress: mockExternalWalletResponse[0].address,
        currency: 'USDC',
        priority: 1,
      });
      expect(result[1]).toMatchObject({
        id: 2,
        walletAddress: mockExternalWalletResponse[1].address,
        currency: 'USDT',
        priority: 2,
      });

      // Should call both endpoints
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/wallet/external'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/wallet/external/priority'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should return empty array when external wallet details are empty', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await cardSDK.getCardExternalWalletDetails();

      expect(result).toEqual([]);
    });

    it('should throw error when external wallet API fails', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
          });
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue([]),
        });
      });

      await expect(
        cardSDK.getCardExternalWalletDetails(),
      ).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message:
          'Failed to get card external wallet details. Please try again.',
      });
    });

    it('should throw error when priority wallet API fails', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue([
              {
                address: '0x1234567890123456789012345678901234567890',
                currency: 'USDC',
                balance: '1000.00',
                allowance: '500.00',
                network: 'linea',
              },
            ]),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      });

      await expect(
        cardSDK.getCardExternalWalletDetails(),
      ).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message:
          'Failed to get card external wallet details. Please try again.',
      });
    });

    it('should sort results by priority (lower number = higher priority)', async () => {
      const mockExternalWalletResponse = [
        {
          address: '0x1234567890123456789012345678901234567890',
          currency: 'USDC',
          balance: '1000.00',
          allowance: '500.00',
          network: 'linea',
        },
        {
          address: '0x0987654321098765432109876543210987654321',
          currency: 'USDT',
          balance: '2000.00',
          allowance: '1000.00',
          network: 'linea',
        },
      ];

      const mockPriorityWalletResponse = [
        {
          id: 1,
          currency: 'USDC',
          network: 'linea',
          priority: 5, // Lower priority
        },
        {
          id: 2,
          currency: 'USDT',
          network: 'linea',
          priority: 1, // Higher priority
        },
      ];

      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue(mockExternalWalletResponse),
          });
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(mockPriorityWalletResponse),
        });
      });

      const result = await cardSDK.getCardExternalWalletDetails();

      // Should be sorted by priority ascending (1 comes before 5)
      expect(result[0].priority).toBe(1);
      expect(result[0].currency).toBe('USDT');
      expect(result[1].priority).toBe(5);
      expect(result[1].currency).toBe('USDC');
    });

    it('should handle missing priority data gracefully', async () => {
      const mockExternalWalletResponse = [
        {
          address: '0x1234567890123456789012345678901234567890',
          currency: 'USDC',
          balance: '1000.00',
          allowance: '500.00',
          network: 'linea',
        },
      ];

      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue(mockExternalWalletResponse),
          });
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue([]),
        });
      });

      const result = await cardSDK.getCardExternalWalletDetails();

      expect(result).toEqual([]);
    });
  });
});
