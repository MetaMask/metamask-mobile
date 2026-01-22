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
  CardLocation,
  CreateOnboardingConsentRequest,
  UserResponse,
  DelegationSettingsNetwork,
} from '../types';
import Logger from '../../../../util/Logger';
import { getCardBaanxToken } from '../util/cardTokenVault';
import AppConstants from '../../../../core/AppConstants';

// Type definition for accessing private methods in tests
interface CardSDKPrivateAccess {
  userCardLocation: string;
  enableLogs: boolean;
  getFirstSupportedTokenOrNull: () => CardToken | null;
  findSupportedTokenByAddress: (address: string) => CardToken | null;
  mapSupportedTokenToCardToken: (token: SupportedToken) => CardToken;
}

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

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: { [key: string]: string } = {
      'card.card_home.enable_card_error':
        'Failed to provision card. Please try again.',
    };
    return translations[key] || key;
  },
}));

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
    it('initializes with correct card feature flag and chain ID', () => {
      expect(cardSDK.isCardEnabled).toBe(true);
      expect(cardSDK.getSupportedTokensByChainId('eip155:59144')).toEqual(
        mockSupportedTokens,
      );
    });
  });

  describe('isCardEnabled', () => {
    it('returns true when card is enabled for the chain', () => {
      expect(cardSDK.isCardEnabled).toBe(true);
    });

    it('returns false when card is disabled for the chain', () => {
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

    it('returns false when chain is not configured', () => {
      const emptyCardFeatureFlag: CardFeatureFlag = {};

      const noChainCardholderSDK = new CardSDK({
        cardFeatureFlag: emptyCardFeatureFlag,
      });

      expect(noChainCardholderSDK.isCardEnabled).toBe(false);
    });
  });

  describe('getSupportedTokensByChainId', () => {
    it('returns supported tokens when card is enabled', () => {
      expect(cardSDK.getSupportedTokensByChainId('eip155:59144')).toEqual(
        mockSupportedTokens,
      );
    });

    it('returns empty array when card is disabled', () => {
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
        disabledCardholderSDK.getSupportedTokensByChainId('eip155:59144'),
      ).toEqual([]);
    });

    it('returns empty array when tokens array is undefined', () => {
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
        noTokensCardSDK.getSupportedTokensByChainId('eip155:59144'),
      ).toEqual([]);
    });

    it('filters out tokens with enabled=false', () => {
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

      const tokens = customSDK.getSupportedTokensByChainId('eip155:59144');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].address).toBe(mockSupportedTokens[0].address);
    });
  });

  describe('error handling for private getters', () => {
    it('throws error when foxConnectAddresses are missing in getSupportedTokensAllowances', async () => {
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
        'FoxConnect contracts are not defined for the current network',
      );
    });

    it('throws error when balanceScannerAddress is missing in getSupportedTokensAllowances', async () => {
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
    it('returns valid token addresses', () => {
      const addresses = cardSDK.getSupportedTokensByChainId('eip155:59144');
      expect(addresses).toHaveLength(2);
      expect(addresses[0].address).toBe(mockSupportedTokens[0].address);
      expect(addresses[1].address).toBe(mockSupportedTokens[1].address);
    });

    it('filters out tokens with invalid addresses', () => {
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

      const addresses = customSDK.getSupportedTokensByChainId('eip155:59144');
      expect(addresses).toHaveLength(1);
      expect(addresses[0].address).toBe(mockSupportedTokens[0].address);
    });
  });

  describe('isCardHolder', () => {
    it('returns empty array when card is not enabled', async () => {
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

    it('returns empty array when no accounts provided', async () => {
      const result = await cardSDK.isCardHolder([]);
      expect(result).toEqual([]);
    });

    it('returns empty array when accounts array is null or undefined', async () => {
      const result = await cardSDK.isCardHolder(
        undefined as unknown as `eip155:${string}:0x${string}`[],
      );
      expect(result).toEqual([]);
    });

    it('processes single batch (≤50 accounts) correctly', async () => {
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

    it('processes multiple batches (up to 150 accounts)', async () => {
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

    it('limits processing to maximum 3 batches (150 accounts)', async () => {
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

    it('returns cardholder accounts when API returns accounts in is array', async () => {
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

    it('returns empty array when API returns empty is array', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          is: [],
        }),
      });

      const result = await cardSDK.isCardHolder([mockTestAddress]);
      expect(result).toEqual([]);
    });

    it('handles API error responses with status code', async () => {
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

    it('handles network errors and returns empty array', async () => {
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(error);

      const result = await cardSDK.isCardHolder([mockTestAddress]);
      expect(result).toEqual([]);
      expect(Logger.log).toHaveBeenCalledWith(
        error,
        'CardSDK: Failed to check if address is a card holder',
      );
    });

    it('handles missing accountsApiUrl gracefully', async () => {
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

    it('constructs correct API request with proper parameters', async () => {
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

    it('returns UNKNOWN when API call fails', async () => {
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValueOnce(error);

      const result = await cardSDK.getGeoLocation();

      expect(result).toBe('UNKNOWN');
      expect(Logger.log).toHaveBeenCalledWith(
        error,
        'CardSDK: Failed to get geolocation',
      );
    });

    it('returns UNKNOWN when fetch throws an error', async () => {
      const fetchError = new Error('Fetch failed');
      (global.fetch as jest.Mock).mockRejectedValueOnce(fetchError);

      const result = await cardSDK.getGeoLocation();

      expect(result).toBe('UNKNOWN');
      expect(Logger.log).toHaveBeenCalledWith(
        fetchError,
        'CardSDK: Failed to get geolocation',
      );
    });

    it('returns UNKNOWN when response.text() throws an error', async () => {
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

    it('handles different country codes correctly', async () => {
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

    it('handles empty string response from API', async () => {
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

    it('throws error when card is not enabled', async () => {
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

    it('returns empty array when no supported tokens', async () => {
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

      const result =
        await emptyTokensCardSDK.getSupportedTokensAllowances(testAddress);
      expect(result).toEqual([]);
    });

    it('returns token allowances correctly', async () => {
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

    it('throws error when card is not enabled', async () => {
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

    it('returns the matching token when only one token has non-zero balance', async () => {
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

    it('returns null when token is not found in supported tokens', async () => {
      const unknownTokenAddress = '0xunknown1234567890123456789012345678901234';
      const result = await cardSDK.getPriorityToken(testAddress, [
        unknownTokenAddress,
      ]);

      expect(result).toBeNull();
    });

    it('analyzes approval logs when multiple tokens have non-zero balances', async () => {
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

    it('returns first supported token when no approval logs are found', async () => {
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

    it('returns null when no supported tokens and no logs', async () => {
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
    it('maps SupportedToken to CardToken correctly', () => {
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
      location: 'international' as CardLocation,
    };

    it('initiates authentication successfully', async () => {
      const mockResponse: CardLoginInitiateResponse = {
        token: 'initiate-token',
        url: 'https://example.com/auth',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result =
        await cardSDK.initiateCardProviderAuthentication(mockQueryParams);

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

    it('handles server error response', async () => {
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

    it('handles network error', async () => {
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

    it('handles timeout error', async () => {
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

    it('sets x-us-env header to true when userCardLocation is us', async () => {
      const usCardSDK = new CardSDK({
        cardFeatureFlag: mockCardFeatureFlag,
        userCardLocation: 'us',
      });

      const usQueryParams = {
        ...mockQueryParams,
        location: 'us' as CardLocation,
      };

      const mockResponse: CardLoginInitiateResponse = {
        token: 'initiate-token',
        url: 'https://example.com/auth',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await usCardSDK.initiateCardProviderAuthentication(usQueryParams);

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
      location: 'international' as CardLocation,
    };

    it('logs in successfully', async () => {
      const mockResponse: CardLoginResponse = {
        phase: null,
        userId: 'user-123',
        isOtpRequired: false,
        phoneNumber: null,
        accessToken: 'login-token',
        verificationState: 'VERIFIED',
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

    it('logs in successfully with OTP code', async () => {
      const mockLoginDataWithOtp = {
        ...mockLoginData,
        otpCode: '123456',
        location: 'us' as CardLocation,
      };

      const mockResponse: CardLoginResponse = {
        phase: null,
        userId: 'user-123',
        isOtpRequired: false,
        phoneNumber: '+1234567890',
        accessToken: 'login-token',
        verificationState: 'VERIFIED',
        isLinked: true,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.login(mockLoginDataWithOtp);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: mockLoginDataWithOtp.email,
            password: mockLoginDataWithOtp.password,
            otpCode: mockLoginDataWithOtp.otpCode,
          }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-us-env': 'true',
            'x-client-key': 'test-api-key',
          }),
        }),
      );
    });

    it('throws ACCOUNT_DISABLED error when account has been disabled', async () => {
      const disabledAccountMessage =
        'Your account has been disabled. Please contact support.';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        json: jest.fn().mockResolvedValue({
          message: disabledAccountMessage,
        }),
      });

      await expect(cardSDK.login(mockLoginData)).rejects.toThrow(CardError);

      await expect(cardSDK.login(mockLoginData)).rejects.toMatchObject({
        type: CardErrorType.ACCOUNT_DISABLED,
        message: disabledAccountMessage,
      });
    });

    it('throws error with invalid credentials', async () => {
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

    it('throws error on server error', async () => {
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

    it('throws error on unknown error status', async () => {
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

    it('throws INVALID_OTP_CODE error when status is 400 and otpCode is provided', async () => {
      const mockLoginDataWithOtp = {
        ...mockLoginData,
        otpCode: '123456',
        location: 'us' as CardLocation,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          message: 'Invalid OTP code',
        }),
      });

      await expect(cardSDK.login(mockLoginDataWithOtp)).rejects.toThrow(
        CardError,
      );

      await expect(cardSDK.login(mockLoginDataWithOtp)).rejects.toMatchObject({
        type: CardErrorType.INVALID_OTP_CODE,
        message: 'Invalid OTP code',
      });
    });
  });

  describe('sendOtpLogin', () => {
    const mockOtpData = {
      userId: 'user-123',
      location: 'international' as CardLocation,
    };

    it('sends OTP login request successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await cardSDK.sendOtpLogin(mockOtpData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/login/otp'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            userId: mockOtpData.userId,
          }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-us-env': 'false',
            'x-client-key': 'test-api-key',
          }),
        }),
      );
    });

    it('sends OTP login request using userCardLocation', async () => {
      const usCardSDK = new CardSDK({
        cardFeatureFlag: mockCardFeatureFlag,
        userCardLocation: 'us',
      });

      const mockOtpDataInternational = {
        userId: 'user-456',
        location: 'us' as CardLocation,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await usCardSDK.sendOtpLogin(mockOtpDataInternational);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/login/otp'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            userId: mockOtpDataInternational.userId,
          }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-us-env': 'true',
            'x-client-key': 'test-api-key',
          }),
        }),
      );
    });

    it('throws error on server error when sending OTP', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal server error'),
      });

      await expect(cardSDK.sendOtpLogin(mockOtpData)).rejects.toThrow(
        CardError,
      );

      await expect(cardSDK.sendOtpLogin(mockOtpData)).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Failed to send OTP login. Please try again.',
      });

      expect(Logger.log).toHaveBeenCalled();
    });

    it('throws error when response text parsing fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockRejectedValue(new Error('Parse error')),
      });

      await expect(cardSDK.sendOtpLogin(mockOtpData)).rejects.toThrow(
        CardError,
      );

      await expect(cardSDK.sendOtpLogin(mockOtpData)).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Failed to send OTP login. Please try again.',
      });

      expect(Logger.log).toHaveBeenCalled();
    });

    it('throws error on network error when sending OTP', async () => {
      const networkError = new Error('Network failure');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      await expect(cardSDK.sendOtpLogin(mockOtpData)).rejects.toThrow(
        CardError,
      );

      await expect(cardSDK.sendOtpLogin(mockOtpData)).rejects.toMatchObject({
        type: CardErrorType.NETWORK_ERROR,
        message: 'Network error. Please check your connection.',
      });
    });

    it('throws error on timeout when sending OTP', async () => {
      const timeoutError = new Error('AbortError');
      timeoutError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValue(timeoutError);

      await expect(cardSDK.sendOtpLogin(mockOtpData)).rejects.toThrow(
        CardError,
      );

      await expect(cardSDK.sendOtpLogin(mockOtpData)).rejects.toMatchObject({
        type: CardErrorType.TIMEOUT_ERROR,
        message: 'Request timed out. Please check your connection.',
      });
    });

    it('returns void on successful OTP send', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      const result = await cardSDK.sendOtpLogin(mockOtpData);

      expect(result).toBeUndefined();
    });
  });

  describe('authorize', () => {
    const mockAuthorizeData = {
      initiateAccessToken: 'initiate-token',
      loginAccessToken: 'login-token',
      location: 'international' as CardLocation,
    };

    it('authorizes successfully', async () => {
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

    it('throws error when authorization fails with invalid credentials', async () => {
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

    it('throws error on server error during authorization', async () => {
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
      location: 'international' as CardLocation,
    };

    const mockRefreshTokenExchangeData = {
      code: 'refresh-token-123',
      grantType: 'refresh_token' as const,
      location: 'international' as CardLocation,
    };

    it('exchanges authorization code successfully', async () => {
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

    it('exchanges refresh token successfully', async () => {
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

    it('throws error when token exchange fails with invalid credentials', async () => {
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

    it('throws error on server error during token exchange', async () => {
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

  describe('makeRequest error scenarios', () => {
    it('handles unknown error type', async () => {
      const unknownError = 'string error';
      (global.fetch as jest.Mock).mockRejectedValue(unknownError);

      await expect(
        cardSDK.login({
          email: 'test@example.com',
          password: 'password',
          location: 'international',
        }),
      ).rejects.toThrow(CardError);

      await expect(
        cardSDK.login({
          email: 'test@example.com',
          password: 'password',
          location: 'international',
        }),
      ).rejects.toMatchObject({
        type: CardErrorType.UNKNOWN_ERROR,
        message: 'An unexpected error occurred.',
      });
    });
  });

  describe('getCardDetails', () => {
    it('gets card details successfully', async () => {
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

    it('throws NO_CARD error when user has no card (404)', async () => {
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

    it('throws SERVER_ERROR for other error statuses', async () => {
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

  describe('provisionCard', () => {
    it('provisions card successfully', async () => {
      const mockResponse = { success: true };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.provisionCard();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/card/order'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            type: 'VIRTUAL',
          }),
          credentials: 'omit',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-us-env': 'false',
            'x-client-key': 'test-api-key',
            Authorization: 'Bearer mock-token',
          }),
        }),
      );
    });

    it('throws SERVER_ERROR with API message when provision fails with message', async () => {
      const errorResponse = {
        message:
          'Unable to place a card order. Please contact customer support',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue(errorResponse),
      });

      let thrownError: CardError | undefined;
      try {
        await cardSDK.provisionCard();
      } catch (error) {
        thrownError = error as CardError;
      }

      expect(thrownError).toBeInstanceOf(CardError);
      expect(thrownError).toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message:
          'Unable to place a card order. Please contact customer support',
      });
      expect(Logger.log).toHaveBeenCalledWith(
        errorResponse,
        'Failed to provision card.',
      );
    });

    it('throws SERVER_ERROR with fallback message when provision fails without message', async () => {
      const errorResponse = { error: 'Card provision failed' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue(errorResponse),
      });

      let thrownError: CardError | undefined;
      try {
        await cardSDK.provisionCard();
      } catch (error) {
        thrownError = error as CardError;
      }

      expect(thrownError).toBeInstanceOf(CardError);
      expect(thrownError).toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Failed to provision card. Please try again.',
      });
      expect(Logger.log).toHaveBeenCalledWith(
        errorResponse,
        'Failed to provision card.',
      );
    });

    it('throws SERVER_ERROR with fallback message when response JSON parsing fails', async () => {
      const parseError = new Error('Invalid JSON');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(parseError),
      });

      let thrownError: CardError | undefined;
      try {
        await cardSDK.provisionCard();
      } catch (error) {
        thrownError = error as CardError;
      }

      expect(thrownError).toBeInstanceOf(CardError);
      expect(thrownError).toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Failed to provision card. Please try again.',
      });
    });

    it('includes authentication token in request', async () => {
      const mockResponse = { success: true };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await cardSDK.provisionCard();

      expect(getCardBaanxToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        }),
      );
    });

    it('provisions card with correct card type', async () => {
      const mockResponse = { success: true };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await cardSDK.provisionCard();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            type: 'VIRTUAL',
          }),
        }),
      );
    });
  });

  describe('getCardExternalWalletDetails', () => {
    const createMockWalletData = (
      externalWallets: {
        address: string;
        currency: string;
        allowance: string;
        network?: string;
      }[],
    ) => {
      const mockExternalWalletResponse = externalWallets.map((wallet) => ({
        address: wallet.address,
        currency: wallet.currency,
        balance: '1000.00',
        allowance: wallet.allowance,
        network: wallet.network || 'linea',
      }));

      const mockPriorityWalletResponse = externalWallets.map(
        (wallet, index) => ({
          id: index + 1,
          address: wallet.address,
          currency: wallet.currency,
          network: wallet.network || 'linea',
          priority: index + 1,
        }),
      );

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
    };

    it('gets external wallet details successfully', async () => {
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
          address: '0x1234567890123456789012345678901234567890',
          currency: 'USDC',
          network: 'linea',
          priority: 1,
        },
        {
          id: 2,
          address: '0x0987654321098765432109876543210987654321',
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

      const result = await cardSDK.getCardExternalWalletDetails([]);

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

    it('returns empty array when external wallet details are empty', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await cardSDK.getCardExternalWalletDetails([]);

      expect(result).toEqual([]);
    });

    it('throws error when external wallet API fails', async () => {
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
        cardSDK.getCardExternalWalletDetails([]),
      ).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message:
          'Failed to get card external wallet details. Please try again.',
      });
    });

    it('throws error when priority wallet API fails', async () => {
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
        cardSDK.getCardExternalWalletDetails([]),
      ).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message:
          'Failed to get card external wallet details. Please try again.',
      });
    });

    it('sorts results by priority (lower number = higher priority)', async () => {
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
          address: '0x1234567890123456789012345678901234567890',
          currency: 'USDC',
          network: 'linea',
          priority: 5, // Lower priority
        },
        {
          id: 2,
          address: '0x0987654321098765432109876543210987654321',
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

      const result = await cardSDK.getCardExternalWalletDetails([]);

      // Should be sorted by priority ascending (1 comes before 5)
      expect(result[0].priority).toBe(1);
      expect(result[0].currency).toBe('USDT');
      expect(result[1].priority).toBe(5);
      expect(result[1].currency).toBe('USDC');
    });

    it('handles missing priority data gracefully', async () => {
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

      const result = await cardSDK.getCardExternalWalletDetails([]);

      expect(result).toEqual([]);
    });

    it.each([
      ['invalid', 'NaN allowance'],
      ['0', 'string zero allowance'],
      ['0x0', 'hex zero allowance'],
    ])(
      'filters out wallets with %s',
      async (invalidAllowance, _description) => {
        createMockWalletData([
          {
            address: '0x1234567890123456789012345678901234567890',
            currency: 'USDC',
            allowance: invalidAllowance,
          },
          {
            address: '0x0987654321098765432109876543210987654321',
            currency: 'USDT',
            allowance: '500',
          },
        ]);

        const result = await cardSDK.getCardExternalWalletDetails([]);

        expect(result).toHaveLength(1);
        expect(result[0].currency).toBe('USDT');
        expect(result[0].allowance).toBe('500');
      },
    );

    it('includes wallets with valid non-zero allowance', async () => {
      createMockWalletData([
        {
          address: '0x1234567890123456789012345678901234567890',
          currency: 'USDC',
          allowance: '500',
        },
        {
          address: '0x0987654321098765432109876543210987654321',
          currency: 'USDT',
          allowance: '1500',
        },
      ]);

      const result = await cardSDK.getCardExternalWalletDetails([]);

      expect(result).toHaveLength(2);
      expect(result[0].currency).toBe('USDC');
      expect(result[1].currency).toBe('USDT');
    });

    it('filters out multiple wallets with mixed invalid allowances', async () => {
      createMockWalletData([
        {
          address: '0x1111111111111111111111111111111111111111',
          currency: 'USDC',
          allowance: 'abc',
        },
        {
          address: '0x2222222222222222222222222222222222222222',
          currency: 'USDT',
          allowance: '0',
        },
        {
          address: '0x3333333333333333333333333333333333333333',
          currency: 'DAI',
          allowance: '0x0',
        },
        {
          address: '0x4444444444444444444444444444444444444444',
          currency: 'WETH',
          allowance: '250',
        },
      ]);

      const result = await cardSDK.getCardExternalWalletDetails([]);

      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('WETH');
    });

    it('filters out wallets with unsupported network', async () => {
      createMockWalletData([
        {
          address: '0x1234567890123456789012345678901234567890',
          currency: 'USDC',
          allowance: '500',
          network: 'ethereum',
        },
        {
          address: '0x0987654321098765432109876543210987654321',
          currency: 'USDT',
          allowance: '1000',
        },
      ]);

      const result = await cardSDK.getCardExternalWalletDetails([]);

      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('USDT');
    });
  });

  describe('emailVerificationSend', () => {
    it('sends email verification successfully', async () => {
      const mockRequest = {
        email: 'test@example.com',
      };

      const mockResponse = {
        contactVerificationId: 'contact123',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.emailVerificationSend(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/email/send'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
        }),
      );
    });

    it('handles email verification send error', async () => {
      const mockRequest = {
        email: 'test@example.com',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid email',
        }),
      });

      await expect(
        cardSDK.emailVerificationSend(mockRequest),
      ).rejects.toMatchObject({
        type: CardErrorType.CONFLICT_ERROR,
      });
    });

    it('handles network error during email verification send', async () => {
      const mockRequest = {
        email: 'test@example.com',
      };

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        cardSDK.emailVerificationSend(mockRequest),
      ).rejects.toMatchObject({
        type: CardErrorType.NETWORK_ERROR,
      });
    });
  });

  describe('emailVerificationVerify', () => {
    it('verifies email successfully', async () => {
      const mockRequest = {
        email: 'test@example.com',
        password: 'password123',
        verificationCode: '123456',
        contactVerificationId: 'contact123',
        countryOfResidence: 'US',
        allowMarketing: false,
        allowSms: false,
      };

      const mockResponse = {
        hasAccount: false,
        onboardingId: 'onboarding123',
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.emailVerificationVerify(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/email/verify'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
        }),
      );
    });

    it('handles email verification verify error', async () => {
      const mockRequest = {
        email: 'test@example.com',
        password: 'password123',
        verificationCode: '123456',
        contactVerificationId: 'contact123',
        countryOfResidence: 'US',
        allowMarketing: false,
        allowSms: false,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid code',
        }),
      });

      await expect(
        cardSDK.emailVerificationVerify(mockRequest),
      ).rejects.toMatchObject({
        type: CardErrorType.CONFLICT_ERROR,
      });
    });
  });

  describe('phoneVerificationSend', () => {
    it('sends phone verification successfully', async () => {
      const mockRequest = {
        phoneCountryCode: '+1',
        phoneNumber: '1234567890',
        contactVerificationId: 'contact123',
      };

      const mockResponse = {
        success: true,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.phoneVerificationSend(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/phone/send'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
        }),
      );
    });

    it('handles phone verification send error', async () => {
      const mockRequest = {
        phoneCountryCode: '+1',
        phoneNumber: '1234567890',
        contactVerificationId: 'contact123',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid phone number',
        }),
      });

      await expect(
        cardSDK.phoneVerificationSend(mockRequest),
      ).rejects.toMatchObject({
        type: CardErrorType.CONFLICT_ERROR,
      });
    });
  });

  describe('phoneVerificationVerify', () => {
    it('verifies phone successfully', async () => {
      const mockRequest = {
        phoneCountryCode: '+1',
        phoneNumber: '1234567890',
        verificationCode: '123456',
        onboardingId: 'onboarding123',
        contactVerificationId: 'contact123',
      };

      const mockResponse = {
        onboardingId: 'onboarding123',
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.phoneVerificationVerify(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/phone/verify'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
        }),
      );
    });

    it('handles phone verification verify error', async () => {
      const mockRequest = {
        phoneCountryCode: '+1',
        phoneNumber: '1234567890',
        verificationCode: '123456',
        onboardingId: 'onboarding123',
        contactVerificationId: 'contact123',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid code',
        }),
      });

      await expect(
        cardSDK.phoneVerificationVerify(mockRequest),
      ).rejects.toMatchObject({
        type: CardErrorType.CONFLICT_ERROR,
      });
    });
  });

  describe('startUserVerification', () => {
    it('starts user verification successfully', async () => {
      const mockRequest = {
        onboardingId: 'onboarding123',
        location: 'us' as CardLocation,
      };

      const mockResponse = {
        success: true,
        verificationId: 'verification123',
        status: 'pending',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.startUserVerification(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/register/verification'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
        }),
      );
    });

    it('handles start user verification error', async () => {
      const mockRequest = {
        onboardingId: 'onboarding123',
        location: 'us' as CardLocation,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          error: 'Server error',
        }),
      });

      await expect(
        cardSDK.startUserVerification(mockRequest),
      ).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Server error while getting registration settings',
      });
    });
  });

  describe('registerPersonalDetails', () => {
    it('registers personal details successfully', async () => {
      const mockRequest = {
        onboardingId: 'onboarding123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        countryOfNationality: 'US',
      };

      const mockResponse = {
        success: true,
        userId: 'user123',
        onboardingId: 'onboarding123',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.registerPersonalDetails(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/register/personal'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
        }),
      );
    });

    it('handles register personal details error', async () => {
      const mockRequest = {
        onboardingId: 'onboarding123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        countryOfNationality: 'US',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid data',
        }),
      });

      await expect(
        cardSDK.registerPersonalDetails(mockRequest),
      ).rejects.toMatchObject({
        type: CardErrorType.CONFLICT_ERROR,
        message: expect.stringMatching(
          /Personal details registration failed: 400/,
        ),
      });
    });
  });

  describe('registerPhysicalAddress', () => {
    it('registers physical address successfully', async () => {
      const mockRequest = {
        onboardingId: 'onboarding123',
        addressLine1: '123 Main St',
        city: 'New York',
        zip: '10001',
        usState: 'NY',
      };

      const mockResponse = {
        success: true,
        addressId: 'address123',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.registerPhysicalAddress(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/register/address'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
        }),
      );
    });

    it('handles register physical address error', async () => {
      const mockRequest = {
        onboardingId: 'onboarding123',
        addressLine1: '123 Main St',
        city: 'New York',
        zip: '10001',
        usState: 'NY',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid address',
        }),
      });

      await expect(
        cardSDK.registerPhysicalAddress(mockRequest),
      ).rejects.toMatchObject({
        type: CardErrorType.CONFLICT_ERROR,
        message: expect.stringMatching(/Address registration failed: 400/),
      });
    });
  });

  describe('registerMailingAddress', () => {
    it('registers mailing address successfully', async () => {
      const mockRequest = {
        onboardingId: 'onboarding123',
        addressLine1: '456 Oak Ave',
        city: 'Los Angeles',
        zip: '90210',
        usState: 'CA',
      };

      const mockResponse = {
        success: true,
        addressId: 'address456',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.registerMailingAddress(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/register/mailing-address'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
        }),
      );
    });

    it('handles register mailing address error', async () => {
      const mockRequest = {
        onboardingId: 'onboarding123',
        addressLine1: '456 Oak Ave',
        city: 'Los Angeles',
        zip: '90210',
        usState: 'CA',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid address',
        }),
      });

      await expect(
        cardSDK.registerMailingAddress(mockRequest),
      ).rejects.toMatchObject({
        type: CardErrorType.CONFLICT_ERROR,
        message: expect.stringMatching(/Address registration failed: 400/),
      });
    });
  });

  describe('getRegistrationSettings', () => {
    it('gets registration settings successfully', async () => {
      const mockResponse = {
        countries: ['US', 'CA', 'GB'],
        requiredFields: ['firstName', 'lastName', 'dateOfBirth'],
        optionalFields: ['middleName'],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.getRegistrationSettings();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/settings'),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('handles get registration settings error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          error: 'Server error',
        }),
      });

      await expect(cardSDK.getRegistrationSettings()).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Server error while getting registration settings',
      });
    });
  });

  describe('getRegistrationStatus', () => {
    it('gets registration status successfully', async () => {
      const onboardingId = 'onboarding123';
      const mockResponse = {
        status: 'pending',
        completedSteps: ['email', 'phone'],
        nextStep: 'personal_details',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.getRegistrationStatus(onboardingId);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `/v1/auth/register?onboardingId=${onboardingId}`,
        ),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('handles get registration status error', async () => {
      const onboardingId = 'onboarding123';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({
          error: 'Not found',
        }),
      });

      await expect(
        cardSDK.getRegistrationStatus(onboardingId),
      ).rejects.toMatchObject({
        type: CardErrorType.CONFLICT_ERROR,
        message: 'Failed to get registration status',
      });
    });
  });

  describe('createOnboardingConsent', () => {
    it('creates onboarding consent successfully', async () => {
      const mockRequest: Omit<CreateOnboardingConsentRequest, 'tenantId'> = {
        policyType: 'us',
        onboardingId: 'onboarding123',
        consents: [],
        metadata: {
          userAgent: AppConstants.USER_AGENT,
          timestamp: new Date().toISOString(),
        },
      };

      const mockResponse = {
        success: true,
        consentId: 'consent123',
        consentSetId: 'consentSet123',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.createOnboardingConsent(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/consent/onboarding'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            ...mockRequest,
            tenantId: 'test-api-key',
          }),
        }),
      );
    });

    it('handles create onboarding consent error', async () => {
      const mockRequest: Omit<CreateOnboardingConsentRequest, 'tenantId'> = {
        policyType: 'us',
        onboardingId: 'onboarding123',
        consents: [],
        metadata: {
          userAgent: AppConstants.USER_AGENT,
          timestamp: new Date().toISOString(),
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid consent data',
        }),
      });

      await expect(
        cardSDK.createOnboardingConsent(mockRequest),
      ).rejects.toMatchObject({
        type: CardErrorType.CONFLICT_ERROR,
        message: 'Failed to create onboarding consent',
      });
    });
  });

  describe('getConsentSetByOnboardingId', () => {
    const onboardingId = 'onboarding123';

    it('gets consent set successfully', async () => {
      const mockResponse = {
        consentSetId: 'consentSet123',
        onboardingId,
        consents: [
          {
            consentId: 'consent1',
            title: 'Terms of Service',
            accepted: true,
          },
        ],
        policyType: 'us',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.getConsentSetByOnboardingId(onboardingId);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/v2/consent/onboarding/${onboardingId}`),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('returns null when consent set not found (404)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({
          message: 'Consent set not found',
        }),
      });

      const result = await cardSDK.getConsentSetByOnboardingId(onboardingId);

      expect(result).toBeNull();
    });

    it('throws CONFLICT_ERROR for 4xx errors (except 404)', async () => {
      const errorMessage = 'Bad request - invalid onboarding id';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          message: errorMessage,
        }),
      });

      await expect(
        cardSDK.getConsentSetByOnboardingId(onboardingId),
      ).rejects.toMatchObject({
        type: CardErrorType.CONFLICT_ERROR,
        message: errorMessage,
      });
    });

    it('throws CONFLICT_ERROR with default message when response has no message', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(
        cardSDK.getConsentSetByOnboardingId(onboardingId),
      ).rejects.toMatchObject({
        type: CardErrorType.CONFLICT_ERROR,
        message: 'Failed to get consent set by onboarding id',
      });
    });

    it('throws SERVER_ERROR for 5xx errors', async () => {
      const errorMessage = 'Internal server error';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          message: errorMessage,
        }),
      });

      await expect(
        cardSDK.getConsentSetByOnboardingId(onboardingId),
      ).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: errorMessage,
      });
    });

    it('throws SERVER_ERROR with default message when response parsing fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      await expect(
        cardSDK.getConsentSetByOnboardingId(onboardingId),
      ).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Server error while getting consent set by onboarding id',
      });
    });

    it('handles network errors', async () => {
      const networkError = new Error('Network failure');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      await expect(
        cardSDK.getConsentSetByOnboardingId(onboardingId),
      ).rejects.toMatchObject({
        type: CardErrorType.NETWORK_ERROR,
        message: 'Network error. Please check your connection.',
      });
    });

    it('handles timeout errors from makeRequest', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValue(timeoutError);

      await expect(
        cardSDK.getConsentSetByOnboardingId(onboardingId),
      ).rejects.toMatchObject({
        type: CardErrorType.TIMEOUT_ERROR,
      });
    });

    it('makes unauthenticated request', async () => {
      const mockResponse = {
        consentSetId: 'consentSet123',
        onboardingId,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await cardSDK.getConsentSetByOnboardingId(onboardingId);

      // Verify it's called without Authorization header (unauthenticated)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('linkUserToConsent', () => {
    it('links user to consent successfully', async () => {
      const consentSetId = 'consentSet123';
      const mockRequest = {
        userId: 'user123',
        onboardingId: 'onboarding123',
        location: 'us' as CardLocation,
      };

      const mockResponse = {
        success: true,
        linkId: 'link123',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await cardSDK.linkUserToConsent(consentSetId, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/v2/consent/onboarding/${consentSetId}`),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(mockRequest),
        }),
      );
    });

    it('handles link user to consent error', async () => {
      const consentSetId = 'consentSet123';
      const mockRequest = {
        userId: 'user123',
        onboardingId: 'onboarding123',
        location: 'us' as CardLocation,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid link data',
        }),
      });

      await expect(
        cardSDK.linkUserToConsent(consentSetId, mockRequest),
      ).rejects.toMatchObject({
        type: CardErrorType.CONFLICT_ERROR,
        message: 'Failed to link user to consent',
      });
    });
  });

  describe('constructor with userCardLocation', () => {
    it('initializes with provided userCardLocation', () => {
      const customCardSDK = new CardSDK({
        cardFeatureFlag: mockCardFeatureFlag,
        userCardLocation: 'us',
      });

      expect(
        (customCardSDK as unknown as CardSDKPrivateAccess).userCardLocation,
      ).toBe('us');
    });

    it('defaults to international when userCardLocation is not provided', () => {
      const customCardSDK = new CardSDK({
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(
        (customCardSDK as unknown as CardSDKPrivateAccess).userCardLocation,
      ).toBe('international');
    });

    it('initializes with enableLogs option', () => {
      const customCardSDK = new CardSDK({
        cardFeatureFlag: mockCardFeatureFlag,
        enableLogs: true,
      });

      expect(
        (customCardSDK as unknown as CardSDKPrivateAccess).enableLogs,
      ).toBe(true);
    });
  });

  describe('private helper methods', () => {
    describe('getFirstSupportedTokenOrNull', () => {
      it('returns first supported token when tokens exist', () => {
        const result = (
          cardSDK as unknown as CardSDKPrivateAccess
        ).getFirstSupportedTokenOrNull();
        expect(result).toEqual({
          address: mockSupportedTokens[0].address || null,
          symbol: mockSupportedTokens[0].symbol || null,
          name: mockSupportedTokens[0].name || null,
          decimals: mockSupportedTokens[0].decimals || null,
        });
      });

      it('returns null when no supported tokens exist', () => {
        const emptyTokensCardFeatureFlag: CardFeatureFlag = {
          chains: {
            'eip155:59144': {
              enabled: true,
              tokens: [],
            },
          },
        };

        const emptyTokensCardSDK = new CardSDK({
          cardFeatureFlag: emptyTokensCardFeatureFlag,
        });

        const result = (
          emptyTokensCardSDK as unknown as CardSDKPrivateAccess
        ).getFirstSupportedTokenOrNull();
        expect(result).toBeNull();
      });
    });

    describe('findSupportedTokenByAddress', () => {
      it('finds token by address (case insensitive)', () => {
        const result = (
          cardSDK as unknown as CardSDKPrivateAccess
        ).findSupportedTokenByAddress(
          mockSupportedTokens[0].address?.toUpperCase() || '',
        );
        expect(result).toEqual({
          address: mockSupportedTokens[0].address || null,
          symbol: mockSupportedTokens[0].symbol || null,
          name: mockSupportedTokens[0].name || null,
          decimals: mockSupportedTokens[0].decimals || null,
        });
      });

      it('returns null when token not found', () => {
        const result = (
          cardSDK as unknown as CardSDKPrivateAccess
        ).findSupportedTokenByAddress('0xnonexistent');
        expect(result).toBeNull();
      });
    });

    describe('mapSupportedTokenToCardToken', () => {
      it('maps supported token to card token correctly', () => {
        const result = (
          cardSDK as unknown as CardSDKPrivateAccess
        ).mapSupportedTokenToCardToken(mockSupportedTokens[0]);
        expect(result).toEqual({
          address: mockSupportedTokens[0].address || null,
          symbol: mockSupportedTokens[0].symbol || null,
          name: mockSupportedTokens[0].name || null,
          decimals: mockSupportedTokens[0].decimals || null,
        });
      });
    });
  });

  describe('getLatestAllowanceFromLogs', () => {
    const mockWalletAddress = '0x1234567890123456789012345678901234567890';
    const mockTokenAddress = '0x0987654321098765432109876543210987654321';
    const mockDelegationContract = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    beforeEach(() => {
      jest.clearAllMocks();
      // Reset ethers mocks
      (ethers.utils.hexZeroPad as jest.Mock).mockImplementation((val) => val);
      (ethers.utils.Interface as unknown as jest.Mock).mockReturnValue({
        getEventTopic: jest.fn().mockReturnValue('0xtopic'),
        parseLog: jest.fn().mockImplementation((log) => ({
          args: {
            value: ethers.BigNumber.from(log.data || '0'),
          },
        })),
      });
    });

    it('returns most recent approval event', async () => {
      const mockLogs = [
        {
          blockNumber: 100,
          logIndex: 1,
          data: '11806489',
          blockHash: '0x1',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xa',
        }, // Most recent approval
        {
          blockNumber: 99,
          logIndex: 0,
          data: '15000000',
          blockHash: '0x2',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xb',
        }, // Older approval
      ];
      mockProvider.getLogs.mockResolvedValue(mockLogs);
      (ethers.BigNumber.from as jest.Mock).mockImplementation((val) => ({
        toString: () => val,
        gt: (other: { toString: () => string }) =>
          parseInt(val, 10) > parseInt(other.toString(), 10),
        isZero: () => val === '0',
      }));

      const result = await cardSDK.getLatestAllowanceFromLogs(
        mockWalletAddress,
        mockTokenAddress,
        mockDelegationContract,
        'linea',
      );

      expect(result).toBe('11806489');
      expect(mockProvider.getLogs).toHaveBeenCalledWith({
        address: mockTokenAddress,
        fromBlock: 2715910,
        toBlock: 'latest',
        topics: expect.any(Array),
      });
    });

    it('returns latest approval when no current allowance provided', async () => {
      const mockLogs = [
        {
          blockNumber: 100,
          logIndex: 0,
          data: '15000000',
          blockHash: '0x1',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xa',
        },
      ];
      mockProvider.getLogs.mockResolvedValue(mockLogs);
      (ethers.BigNumber.from as jest.Mock).mockImplementation((val) => ({
        toString: () => val,
        gt: () => true,
        isZero: () => val === '0',
      }));

      const result = await cardSDK.getLatestAllowanceFromLogs(
        mockWalletAddress,
        mockTokenAddress,
        mockDelegationContract,
        'linea',
      );

      expect(result).toBe('15000000');
    });

    it('returns most recent approval regardless of value', async () => {
      const mockLogs = [
        {
          blockNumber: 102,
          logIndex: 0,
          data: '11806489',
          blockHash: '0x1',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xa',
        }, // Most recent
        {
          blockNumber: 101,
          logIndex: 0,
          data: '10000000',
          blockHash: '0x2',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xb',
        }, // Older
        {
          blockNumber: 100,
          logIndex: 0,
          data: '15000000',
          blockHash: '0x3',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xc',
        }, // Oldest
      ];
      mockProvider.getLogs.mockResolvedValue(mockLogs);
      (ethers.BigNumber.from as jest.Mock).mockImplementation((val) => ({
        toString: () => val,
        gt: (other: { toString: () => string }) =>
          parseInt(val, 10) > parseInt(other.toString(), 10),
        isZero: () => val === '0',
      }));

      const result = await cardSDK.getLatestAllowanceFromLogs(
        mockWalletAddress,
        mockTokenAddress,
        mockDelegationContract,
        'linea',
      );

      expect(result).toBe('11806489');
    });

    it('returns most recent log when no approval greater than current found', async () => {
      const mockLogs = [
        {
          blockNumber: 100,
          logIndex: 0,
          data: '5000000',
          blockHash: '0x1',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xa',
        },
        {
          blockNumber: 99,
          logIndex: 0,
          data: '3000000',
          blockHash: '0x2',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xb',
        },
      ];
      mockProvider.getLogs.mockResolvedValue(mockLogs);
      (ethers.BigNumber.from as jest.Mock).mockImplementation((val) => ({
        toString: () => val,
        gt: () => false,
        isZero: () => val === '0',
      }));

      const result = await cardSDK.getLatestAllowanceFromLogs(
        mockWalletAddress,
        mockTokenAddress,
        mockDelegationContract,
        'linea',
      );

      expect(result).toBe('5000000'); // Returns latest log
    });

    it('returns null when no logs found', async () => {
      mockProvider.getLogs.mockResolvedValue([]);

      const result = await cardSDK.getLatestAllowanceFromLogs(
        mockWalletAddress,
        mockTokenAddress,
        mockDelegationContract,
        'linea',
      );

      expect(result).toBeNull();
    });

    it('sorts logs chronologically (newest first)', async () => {
      const mockLogs = [
        {
          blockNumber: 98,
          logIndex: 0,
          data: '1000000',
          blockHash: '0x1',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xa',
        },
        {
          blockNumber: 100,
          logIndex: 2,
          data: '3000000',
          blockHash: '0x2',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xb',
        },
        {
          blockNumber: 100,
          logIndex: 1,
          data: '2000000',
          blockHash: '0x3',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xc',
        },
        {
          blockNumber: 99,
          logIndex: 0,
          data: '1500000',
          blockHash: '0x4',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xd',
        },
      ];
      mockProvider.getLogs.mockResolvedValue(mockLogs);
      (ethers.BigNumber.from as jest.Mock).mockImplementation((val) => ({
        toString: () => val,
        gt: () => true,
        isZero: () => val === '0',
      }));

      const result = await cardSDK.getLatestAllowanceFromLogs(
        mockWalletAddress,
        mockTokenAddress,
        mockDelegationContract,
        'linea',
      );

      // Most recent should be block 100, logIndex 2
      expect(result).toBe('3000000');
    });

    it('returns most recent approval even when value is zero', async () => {
      const mockLogs = [
        {
          blockNumber: 100,
          logIndex: 0,
          data: '0',
          blockHash: '0x1',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xa',
        }, // Most recent (revoked)
        {
          blockNumber: 99,
          logIndex: 0,
          data: '15000000',
          blockHash: '0x2',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xb',
        }, // Older approval
      ];
      mockProvider.getLogs.mockResolvedValue(mockLogs);
      (ethers.BigNumber.from as jest.Mock).mockImplementation((val) => ({
        toString: () => val,
        gt: (other: { toString: () => string }) =>
          parseInt(val, 10) > parseInt(other.toString(), 10),
        isZero: () => val === '0',
      }));

      const result = await cardSDK.getLatestAllowanceFromLogs(
        mockWalletAddress,
        mockTokenAddress,
        mockDelegationContract,
        'linea',
      );

      expect(result).toBe('0'); // Returns most recent, even if zero
    });

    it('logs error and returns null when getLogs fails', async () => {
      const mockError = new Error('RPC error');
      mockProvider.getLogs.mockRejectedValue(mockError);

      const result = await cardSDK.getLatestAllowanceFromLogs(
        mockWalletAddress,
        mockTokenAddress,
        mockDelegationContract,
        'linea',
      );

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalledWith(
        mockError,
        `getLatestAllowanceFromLogs: Failed to get latest allowance for token ${mockTokenAddress}`,
      );
    });

    it('calls getLogs with correct parameters', async () => {
      mockProvider.getLogs.mockResolvedValue([]);
      (ethers.utils.hexZeroPad as jest.Mock).mockImplementation(
        (addr) => `padded_${addr}`,
      );

      await cardSDK.getLatestAllowanceFromLogs(
        mockWalletAddress,
        mockTokenAddress,
        mockDelegationContract,
        'linea',
      );

      expect(mockProvider.getLogs).toHaveBeenCalledWith({
        address: mockTokenAddress,
        fromBlock: 2715910,
        toBlock: 'latest',
        topics: [
          '0xtopic',
          `padded_${mockWalletAddress.toLowerCase()}`,
          `padded_${mockDelegationContract.toLowerCase()}`,
        ],
      });
    });

    it('handles large approval values correctly', async () => {
      const largeValue = '2199023255551000000'; // Unlimited approval
      const mockLogs = [
        {
          blockNumber: 100,
          logIndex: 0,
          data: largeValue,
          blockHash: '0x1',
          transactionIndex: 0,
          removed: false,
          address: mockTokenAddress,
          topics: [],
          transactionHash: '0xa',
        },
      ];
      mockProvider.getLogs.mockResolvedValue(mockLogs);
      (ethers.BigNumber.from as jest.Mock).mockImplementation((val) => ({
        toString: () => val,
        gt: () => true,
        isZero: () => false,
      }));

      const result = await cardSDK.getLatestAllowanceFromLogs(
        mockWalletAddress,
        mockTokenAddress,
        mockDelegationContract,
        'linea',
      );

      expect(result).toBe(largeValue);
    });
  });

  describe('getUserDetails', () => {
    const mockUserDetails: UserResponse = {
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      email: 'john.doe@example.com',
      verificationState: 'VERIFIED',
      phoneNumber: '1234567890',
      phoneCountryCode: '+1',
      addressLine1: '123 Main St',
      addressLine2: null,
      city: 'New York',
      usState: 'NY',
      zip: '10001',
      countryOfResidence: 'US',
      countryOfNationality: 'US',
      ssn: null,
      createdAt: '2021-01-01',
    };

    beforeEach(() => {
      (getCardBaanxToken as jest.Mock).mockResolvedValue({
        success: true,
        tokenData: { accessToken: 'mock-access-token' },
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully retrieve user details', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserDetails),
      });

      const result = await cardSDK.getUserDetails();

      expect(result).toEqual(mockUserDetails);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/user'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-access-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should throw CardError with INVALID_CREDENTIALS for 401 status', async () => {
      const mockErrorResponse = {
        message: 'Unauthorized access',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue(mockErrorResponse),
      });

      await expect(cardSDK.getUserDetails()).rejects.toThrow(CardError);
      await expect(cardSDK.getUserDetails()).rejects.toMatchObject({
        type: CardErrorType.INVALID_CREDENTIALS,
        message: mockErrorResponse.message,
      });
    });

    it('should throw CardError with INVALID_CREDENTIALS for 403 status', async () => {
      const mockErrorResponse = {
        message: 'Forbidden access',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        json: jest.fn().mockResolvedValue(mockErrorResponse),
      });

      await expect(cardSDK.getUserDetails()).rejects.toThrow(CardError);
      await expect(cardSDK.getUserDetails()).rejects.toMatchObject({
        type: CardErrorType.INVALID_CREDENTIALS,
        message: mockErrorResponse.message,
      });
    });

    it('should throw CardError with INVALID_CREDENTIALS default message for 401 when no message in response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(cardSDK.getUserDetails()).rejects.toThrow(CardError);
      await expect(cardSDK.getUserDetails()).rejects.toMatchObject({
        type: CardErrorType.INVALID_CREDENTIALS,
        message: 'Invalid credentials. Please try logging in again.',
      });
    });

    it('should throw CardError with SERVER_ERROR for 500 status', async () => {
      const mockErrorResponse = {
        message: 'Internal server error',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue(mockErrorResponse),
      });

      await expect(cardSDK.getUserDetails()).rejects.toThrow(CardError);
      await expect(cardSDK.getUserDetails()).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: mockErrorResponse.message,
      });
    });

    it('should throw CardError with SERVER_ERROR default message when no message in response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(cardSDK.getUserDetails()).rejects.toThrow(CardError);
      await expect(cardSDK.getUserDetails()).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Failed to get user details. Please try again.',
      });
    });

    it('should throw CardError with SERVER_ERROR for 404 status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ message: 'User not found' }),
      });

      await expect(cardSDK.getUserDetails()).rejects.toThrow(CardError);
      await expect(cardSDK.getUserDetails()).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'User not found',
      });
    });

    it('should handle response body parsing error gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(new Error('Parse error')),
      });

      await expect(cardSDK.getUserDetails()).rejects.toThrow(CardError);
      await expect(cardSDK.getUserDetails()).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Failed to get user details. Please try again.',
      });
    });

    it('should log debug info on error when enableLogs is true', async () => {
      const cardSDKWithLogs = new CardSDK({
        cardFeatureFlag: mockCardFeatureFlag,
        enableLogs: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
      });

      await expect(cardSDKWithLogs.getUserDetails()).rejects.toThrow(CardError);

      expect(Logger.log).toHaveBeenCalledWith(
        expect.stringContaining('CardSDK Debug Log - getUserDetails::error'),
        expect.stringContaining('Status: 401'),
      );
    });

    it('should use authenticated request with bearer token', async () => {
      const mockAccessToken = 'test-bearer-token';
      (getCardBaanxToken as jest.Mock).mockResolvedValue({
        success: true,
        tokenData: { accessToken: mockAccessToken },
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserDetails),
      });

      await cardSDK.getUserDetails();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        }),
      );
    });

    it('should handle missing bearer token gracefully', async () => {
      (getCardBaanxToken as jest.Mock).mockResolvedValue({
        success: false,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserDetails),
      });

      const result = await cardSDK.getUserDetails();

      expect(result).toEqual(mockUserDetails);
      // Should still make the request even without bearer token
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle bearer token retrieval error', async () => {
      (getCardBaanxToken as jest.Mock).mockRejectedValue(
        new Error('Token retrieval failed'),
      );

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserDetails),
      });

      const result = await cardSDK.getUserDetails();

      expect(result).toEqual(mockUserDetails);
      expect(Logger.log).toHaveBeenCalledWith(
        'Failed to retrieve Card bearer token:',
        expect.any(Error),
      );
    });
  });

  describe('mapCardExternalWalletDetailsToDelegationSettings', () => {
    const mockDelegationSettings: DelegationSettingsNetwork[] = [
      {
        network: 'linea',
        environment: 'production',
        chainId: '59144',
        delegationContract: '0xDelegationContract123',
        tokens: {
          usdc: {
            symbol: 'USDC',
            decimals: 6,
            address: '0xUSDCAddress123',
          },
          usdt: {
            symbol: 'USDT',
            decimals: 6,
            address: '0xUSDTAddress456',
          },
        },
      },
      {
        network: 'linea',
        environment: 'staging',
        chainId: '59144',
        delegationContract: '0xStagingDelegationContract',
        tokens: {
          usdc: {
            symbol: 'USDC',
            decimals: 6,
            address: '0xStagingUSDCAddress',
          },
        },
      },
    ];

    it('returns token details with delegation contract when network and token are in delegation settings', () => {
      const walletExternal = {
        address: '0xWalletAddress',
        currency: 'USDC',
        balance: '1000',
        allowance: '500',
        network: 'linea' as const,
      };

      const result = cardSDK.mapCardExternalWalletDetailsToDelegationSettings(
        walletExternal,
        mockDelegationSettings,
      );

      expect(result).toEqual({
        symbol: 'USDC',
        address: '0xUSDCAddress123',
        decimals: 6,
        decimalChainId: '59144',
        name: 'USD Coin',
        delegationContractAddress: '0xDelegationContract123',
      });
    });

    it('returns fallback token details with empty delegation contract when network is not in delegation settings', () => {
      const walletExternal = {
        address: '0xWalletAddress',
        currency: 'USDC',
        balance: '1000',
        allowance: '500',
        network: 'linea' as const,
      };

      // Empty delegation settings - network not found
      const result = cardSDK.mapCardExternalWalletDetailsToDelegationSettings(
        walletExternal,
        [],
      );

      expect(result).toEqual({
        symbol: 'USDC',
        address: '0x1234567890123456789012345678901234567890',
        decimals: 6,
        decimalChainId: 59144,
        name: 'USD Coin',
        delegationContractAddress: '',
        stagingTokenAddress: null,
      });
    });

    it('returns fallback token details with empty delegation contract when token is not in delegation settings', () => {
      const walletExternal = {
        address: '0xWalletAddress',
        currency: 'DAI', // DAI is not in delegation settings but is a supported token
        balance: '1000',
        allowance: '500',
        network: 'linea' as const,
      };

      // Add DAI to supported tokens for this test
      const cardFeatureFlagWithDAI = {
        ...mockCardFeatureFlag,
        chains: {
          'eip155:59144': {
            ...mockCardFeatureFlag.chains?.['eip155:59144'],
            tokens: [
              ...mockSupportedTokens,
              {
                address: '0xDAIAddress789',
                symbol: 'DAI',
                name: 'Dai Stablecoin',
                decimals: 18,
              },
            ],
          },
        },
      };

      const sdkWithDAI = new CardSDK({
        cardFeatureFlag: cardFeatureFlagWithDAI,
      });

      const result =
        sdkWithDAI.mapCardExternalWalletDetailsToDelegationSettings(
          walletExternal,
          mockDelegationSettings, // DAI not in delegation settings tokens
        );

      expect(result).toEqual({
        symbol: 'DAI',
        address: '0xDAIAddress789',
        decimals: 18,
        decimalChainId: '59144',
        name: 'Dai Stablecoin',
        delegationContractAddress: '',
        stagingTokenAddress: null,
      });
    });

    it('returns null when network is not in delegation settings and token is not in supported tokens', () => {
      const walletExternal = {
        address: '0xWalletAddress',
        currency: 'UNKNOWN_TOKEN',
        balance: '1000',
        allowance: '500',
        network: 'linea' as const,
      };

      const result = cardSDK.mapCardExternalWalletDetailsToDelegationSettings(
        walletExternal,
        [], // Empty delegation settings
      );

      expect(result).toBeNull();
    });

    it('returns null when token is not in delegation settings and not in supported tokens', () => {
      const walletExternal = {
        address: '0xWalletAddress',
        currency: 'UNKNOWN_TOKEN',
        balance: '1000',
        allowance: '500',
        network: 'linea' as const,
      };

      const result = cardSDK.mapCardExternalWalletDetailsToDelegationSettings(
        walletExternal,
        mockDelegationSettings,
      );

      expect(result).toBeNull();
    });

    it('returns staging token details when environment is staging', () => {
      const walletExternal = {
        address: '0xWalletAddress',
        currency: 'USDC',
        balance: '1000',
        allowance: '500',
        network: 'linea' as const,
      };

      // Filter to only staging settings
      const stagingDelegationSettings = mockDelegationSettings.filter(
        (s) => s.environment === 'staging',
      );

      const result = cardSDK.mapCardExternalWalletDetailsToDelegationSettings(
        walletExternal,
        stagingDelegationSettings,
      );

      expect(result).toEqual({
        symbol: 'USDC',
        address: '0x1234567890123456789012345678901234567890',
        decimals: 6,
        decimalChainId: '59144',
        name: 'USD Coin',
        delegationContractAddress: '0xStagingDelegationContract',
        stagingTokenAddress: '0xStagingUSDCAddress',
      });
    });

    it('uses default decimals of 18 when supported token has no decimals in fallback', () => {
      const cardFeatureFlagNoDecimals = {
        ...mockCardFeatureFlag,
        chains: {
          'eip155:59144': {
            ...mockCardFeatureFlag.chains?.['eip155:59144'],
            tokens: [
              {
                address: '0xTokenNoDecimals',
                symbol: 'TND',
                name: 'Token No Decimals',
                // decimals intentionally omitted
              },
            ],
          },
        },
      };

      const sdkNoDecimals = new CardSDK({
        cardFeatureFlag: cardFeatureFlagNoDecimals,
      });

      const walletExternal = {
        address: '0xWalletAddress',
        currency: 'TND',
        balance: '1000',
        allowance: '500',
        network: 'linea' as const,
      };

      const result =
        sdkNoDecimals.mapCardExternalWalletDetailsToDelegationSettings(
          walletExternal,
          [], // Empty delegation settings to trigger fallback
        );

      expect(result).toEqual({
        symbol: 'TND',
        address: '0xTokenNoDecimals',
        decimals: 18, // Default fallback
        decimalChainId: 59144,
        name: 'Token No Decimals',
        delegationContractAddress: '',
        stagingTokenAddress: null,
      });
    });
  });
});
