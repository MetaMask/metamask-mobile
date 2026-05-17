import { CardSDK } from './CardSDK';
import {
  CardFeatureFlag,
  SupportedToken,
} from '../../../../selectors/featureFlagController/card/index';
import {
  CardErrorType,
  UserResponse,
  DelegationSettingsResponse,
} from '../types';
import { getCardBaanxToken } from '../util/cardTokenVault';

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

jest.mock('../util/cardTokenVault', () => ({
  getCardBaanxToken: jest.fn(),
}));

jest.mock('../../../../util/networks', () => ({
  getDecimalChainId: jest.fn().mockReturnValue('59144'),
}));

global.fetch = jest.fn();

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

  const mockSupportedTokens: SupportedToken[] = [
    {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MM_CARD_BAANX_API_CLIENT_KEY = 'test-api-key';

    mockCardFeatureFlag = {
      constants: {
        onRampApiUrl: 'https://on-ramp.uat-api.cx.metamask.io',
      },
      chains: {
        'eip155:59144': {
          enabled: true,
          tokens: mockSupportedTokens,
        },
      },
    };

    cardSDK = new CardSDK({
      cardFeatureFlag: mockCardFeatureFlag,
    });

    (getCardBaanxToken as jest.Mock).mockResolvedValue({
      success: true,
      tokenData: { accessToken: 'mock-token' },
    });
  });

  describe('getSupportedTokensByChainId', () => {
    it('returns supported tokens', () => {
      expect(cardSDK.getSupportedTokensByChainId('eip155:59144')).toEqual(
        mockSupportedTokens,
      );
    });

    it('returns empty array when tokens array is undefined', () => {
      const noTokensCardFeatureFlag: CardFeatureFlag = {
        constants: {},
        chains: {
          'eip155:59144': {
            enabled: true,
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
          ...mockSupportedTokens[0],
          address: '0x0987654321098765432109876543210987654321',
          symbol: 'USDT',
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

    it('retrieves user details', async () => {
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
        }),
      );
    });

    it('throws CardError on 401', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
      });

      await expect(cardSDK.getUserDetails()).rejects.toMatchObject({
        type: CardErrorType.INVALID_CREDENTIALS,
      });
    });
  });

  describe('getDelegationSettings', () => {
    const mockDelegation: DelegationSettingsResponse = {
      networks: [
        {
          network: 'linea',
          chainId: '59144',
          delegationContract: '0xDeleg',
          environment: 'production',
          tokens: {
            usdc: {
              address: '0xToken',
              symbol: 'USDC',
              decimals: 6,
            },
          },
        },
      ],
      count: 1,
      _links: { self: '/v1/delegation/chain/config' },
    };

    it('returns validated delegation settings', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockDelegation),
      });

      const result = await cardSDK.getDelegationSettings();

      expect(result).toEqual(mockDelegation);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/delegation/chain/config'),
        expect.any(Object),
      );
    });
  });

  describe('emailVerificationSend', () => {
    it('posts email verification request', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await cardSDK.emailVerificationSend({
        email: 'a@b.com',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/register/email/send'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('createOrder', () => {
    const mockOrderResponse = {
      orderId: 'order-123',
      paymentConfig: {
        paymentAmount: 100,
        paymentCurrency: 'USDC',
        destinationAddress: '0x1234567890123456789012345678901234567890',
        destinationChainId: '59144',
        destinationTokenSymbol: 'USDC',
        destinationTokenAddress: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
      },
    };

    it('creates order with expected body', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockOrderResponse),
      });

      const result = await cardSDK.createOrder();

      expect(result).toEqual(mockOrderResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/order'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            productId: 'PREMIUM_SUBSCRIPTION',
            paymentMethod: 'CRYPTO_EXTERNAL_DAIMO',
          }),
        }),
      );
    });

    it('maps fetch failure to NETWORK_ERROR', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'));

      await expect(cardSDK.createOrder()).rejects.toMatchObject({
        type: CardErrorType.NETWORK_ERROR,
      });
    });
  });

  describe('getOrderStatus', () => {
    it('returns order status when ok', async () => {
      const body = { orderId: 'o1', status: 'PENDING' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(body),
      });

      await expect(cardSDK.getOrderStatus('o1')).resolves.toEqual(body);
    });

    it('throws NOT_FOUND on 404 before handleApiResponse', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn(),
      });

      await expect(cardSDK.getOrderStatus('missing')).rejects.toMatchObject({
        type: CardErrorType.NOT_FOUND,
      });
    });
  });

  describe('getRegistrationStatus', () => {
    it('requests registration with onboarding id', async () => {
      const user: Partial<UserResponse> = { id: 'u1', email: 'x@y.com' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(user),
      });

      const result = await cardSDK.getRegistrationStatus('onb-1', 'us');

      expect(result).toEqual(user);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('onboardingId=onb-1'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });
  });
});
