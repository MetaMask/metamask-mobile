import React, { useContext } from 'react';
import { Text } from 'react-native';
import { screen, act } from '@testing-library/react-native';
import {
  DepositSDK,
  DepositSDKContext,
  DepositSDKProvider,
  useDepositSDK,
} from '.';
import { DEPOSIT_REGIONS } from '../constants';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

import {
  NativeRampsSdk,
  TransakEnvironment,
} from '@consensys/native-ramps-sdk';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('../utils/ProviderTokenVault', () => ({
  getProviderToken: jest
    .fn()
    .mockResolvedValue({ success: false, token: null }),
  storeProviderToken: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@consensys/native-ramps-sdk', () => ({
  ...jest.requireActual('@consensys/native-ramps-sdk'),
  NativeRampsSdk: jest.fn().mockImplementation(() => ({
    getVersion: jest.fn().mockReturnValue('1.0.0'),
    getBuyQuote: jest.fn().mockResolvedValue({
      quoteId: 'quote-id',
      fiatAmount: 100,
      conversionPrice: 1000,
      marketConversionPrice: 1000,
      slippage: 0,
      fiatCurrency: 'USD',
      cryptoCurrency: 'ETH',
      paymentMethod: 'credit_card',
      cryptoAmount: 0.1,
      isBuyOrSell: 'BUY',
      network: 'mainnet',
      feeDecimal: 0,
      totalFee: 0,
      feeBreakdown: [],
      nonce: 1,
      cryptoLiquidityProvider: 'provider',
      notes: [],
    }),
    getUserDetails: jest.fn().mockResolvedValue({
      id: 'user-id',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      mobileNumber: '1234567890',
      status: 'active',
      dob: '1990-01-01',
      kyc: {
        l1: {
          status: 'APPROVED',
          type: 'BASIC',
          updatedAt: '2023-01-01',
          kycSubmittedAt: '2023-01-01',
        },
      },
      address: {
        addressLine1: '123 Main St',
        addressLine2: '',
        state: 'NY',
        city: 'New York',
        postCode: '10001',
        country: 'United States',
        countryCode: 'US',
      },
      createdAt: '2023-01-01',
      isKycApproved: jest.fn().mockReturnValue(true),
    }),
    setAccessToken: jest.fn(),
  })),
}));

const mockedState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          depositConfig: {
            providerApiKey: 'test-provider-api-key',
            providerFrontendAuth: 'test-provider-frontend-auth',
          },
        },
      },
    },
  },
  fiatOrders: {
    selectedRegionDeposit: null,
    getStartedDeposit: false,
  },
};

describe('Deposit SDK Context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
  });

  describe('DepositSDKProvider', () => {
    it('renders and provides context values', () => {
      const ConsumerComponent = () => {
        const { providerApiKey, providerFrontendAuth } = useContext(
          DepositSDKContext,
        ) as DepositSDK;
        return (
          <Text>
            {`API Key: ${providerApiKey}, Frontend Auth: ${providerFrontendAuth}`}
          </Text>
        );
      };

      renderWithProvider(
        <DepositSDKProvider>
          <ConsumerComponent />
        </DepositSDKProvider>,
        {
          state: mockedState,
        },
      );
      expect(screen.toJSON()).toMatchSnapshot();
      const textElement = screen.getByText(
        'API Key: test-provider-api-key, Frontend Auth: test-provider-frontend-auth',
      );
      expect(textElement).toBeOnTheScreen();
    });

    it('initializes NativeRampsSdk with correct parameters', () => {
      renderWithProvider(
        <DepositSDKProvider>
          <Text>Test Component</Text>
        </DepositSDKProvider>,
        {
          state: mockedState,
        },
      );

      expect(NativeRampsSdk).toHaveBeenCalledWith(
        {
          partnerApiKey: 'test-provider-api-key',
          frontendAuth: 'test-provider-frontend-auth',
        },
        TransakEnvironment.Staging,
      );
    });
  });

  describe('useDepositSDK', () => {
    it('provides access to the NativeRampsSdk instance', () => {
      const TestComponent = () => {
        const { sdk } = useDepositSDK();

        React.useEffect(() => {
          if (sdk) {
            sdk.getBuyQuote('USD', 'ETH', 'mainnet', 'credit_card', '100');
          }
        }, [sdk]);
        return <Text>Test Component</Text>;
      };

      renderWithProvider(
        <DepositSDKProvider>
          <TestComponent />
        </DepositSDKProvider>,
        {
          state: mockedState,
        },
      );
      expect(screen.toJSON()).toMatchSnapshot();

      const mockSdkInstance = (NativeRampsSdk as jest.Mock).mock.results[0]
        .value;
      expect(mockSdkInstance.getBuyQuote).toHaveBeenCalledWith(
        'USD',
        'ETH',
        'mainnet',
        'credit_card',
        '100',
      );
    });

    it('allows calling SDK methods through the context', async () => {
      const TestComponent = () => {
        const { sdk } = useDepositSDK();
        return (
          <Text
            testID="sdk-test"
            onPress={() =>
              sdk?.getBuyQuote('USD', 'ETH', 'mainnet', 'credit_card', '100')
            }
          >
            Test SDK
          </Text>
        );
      };

      const { getByTestId } = renderWithProvider(
        <DepositSDKProvider>
          <TestComponent />
        </DepositSDKProvider>,
        {
          state: mockedState,
        },
      );

      // Manually trigger the onPress event
      const button = getByTestId('sdk-test');
      button.props.onPress();

      const mockSdkInstance = (NativeRampsSdk as jest.Mock).mock.results[0]
        .value;
      expect(mockSdkInstance.getBuyQuote).toHaveBeenCalledWith(
        'USD',
        'ETH',
        'mainnet',
        'credit_card',
        '100',
      );
    });
  });

  describe('NativeRampsSdk integration', () => {
    it('allows calling SDK methods through the context', async () => {
      const TestComponent = () => {
        const { sdk } = useDepositSDK();
        return (
          <Text
            testID="sdk-test"
            onPress={() =>
              sdk?.getBuyQuote('USD', 'ETH', 'mainnet', 'credit_card', '100')
            }
          >
            Test SDK
          </Text>
        );
      };

      const { getByTestId } = renderWithProvider(
        <DepositSDKProvider>
          <TestComponent />
        </DepositSDKProvider>,
        {
          state: mockedState,
        },
      );

      const button = getByTestId('sdk-test');
      button.props.onPress();

      const mockSdkInstance = (NativeRampsSdk as jest.Mock).mock.results[0]
        .value;
      expect(mockSdkInstance.getBuyQuote).toHaveBeenCalledWith(
        'USD',
        'ETH',
        'mainnet',
        'credit_card',
        '100',
      );
    });

    it('throws an error when used outside of provider', () => {
      const TestComponent = () => {
        try {
          useDepositSDK();
          return <Text>This should not render</Text>;
        } catch (error) {
          return <Text>Error thrown correctly</Text>;
        }
      };

      renderWithProvider(<TestComponent />);
      expect(screen.getByText('Error thrown correctly')).toBeOnTheScreen();
    });
  });

  describe('Region Management', () => {
    it('initializes with region from Redux state', () => {
      const testRegion =
        DEPOSIT_REGIONS.find((region) => region.isoCode === 'US') || null;
      const stateWithRegion = {
        ...mockedState,
        fiatOrders: {
          ...mockedState.fiatOrders,
          selectedRegionDeposit: testRegion,
        },
      };

      let contextValue: ReturnType<typeof useDepositSDK> | undefined;
      const TestComponent = () => {
        contextValue = useDepositSDK();
        return null;
      };

      renderWithProvider(
        <DepositSDKProvider>
          <TestComponent />
        </DepositSDKProvider>,
        { state: stateWithRegion },
      );

      expect(contextValue?.selectedRegion).toEqual(testRegion);
    });

    it('initializes with US region as default when Redux state is null', () => {
      let contextValue: ReturnType<typeof useDepositSDK> | undefined;
      const TestComponent = () => {
        contextValue = useDepositSDK();
        return null;
      };

      renderWithProvider(
        <DepositSDKProvider>
          <TestComponent />
        </DepositSDKProvider>,
        { state: mockedState },
      );

      const usRegion = DEPOSIT_REGIONS.find(
        (region) => region.isoCode === 'US',
      );
      expect(contextValue?.selectedRegion).toEqual(usRegion);
    });

    it('updates region and dispatches to Redux when setSelectedRegion is called', () => {
      let contextValue: ReturnType<typeof useDepositSDK> | undefined;
      const TestComponent = () => {
        contextValue = useDepositSDK();
        return null;
      };

      renderWithProvider(
        <DepositSDKProvider>
          <TestComponent />
        </DepositSDKProvider>,
        { state: mockedState },
      );

      const newRegion =
        DEPOSIT_REGIONS.find((region) => region.isoCode === 'CA') || null;

      act(() => {
        contextValue?.setSelectedRegion(newRegion);
      });

      expect(contextValue?.selectedRegion).toEqual(newRegion);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'FIAT_SET_REGION_DEPOSIT',
        payload: newRegion,
      });
    });
  });

  describe('Authentication', () => {
    it('handles authentication state correctly', async () => {
      let contextValue: ReturnType<typeof useDepositSDK> | undefined;
      const TestComponent = () => {
        contextValue = useDepositSDK();
        return null;
      };

      renderWithProvider(
        <DepositSDKProvider>
          <TestComponent />
        </DepositSDKProvider>,
        { state: mockedState },
      );

      expect(contextValue?.isAuthenticated).toBe(false);

      const mockToken = {
        id: 'test-token-id',
        accessToken: 'test-token',
        ttl: 3600,
        created: new Date(),
        userId: 'test-user-id',
      };

      await act(async () => {
        const result = await contextValue?.setAuthToken(mockToken);
        expect(result).toBe(true);
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(contextValue?.isAuthenticated).toBe(true);
    });

    it('checks for existing token', async () => {
      let contextValue: ReturnType<typeof useDepositSDK> | undefined;
      const TestComponent = () => {
        contextValue = useDepositSDK();
        return null;
      };

      renderWithProvider(
        <DepositSDKProvider>
          <TestComponent />
        </DepositSDKProvider>,
        {
          state: mockedState,
        },
      );

      const result = await contextValue?.checkExistingToken();
      expect(result).toBe(false);
    });

    it('sets auth token and returns true when existing token is found', async () => {
      const originalMock = jest.requireMock(
        '../utils/ProviderTokenVault',
      ).getProviderToken;

      const mockToken = {
        id: 'existing-token-id',
        accessToken: 'existing-token',
        ttl: 3600,
        created: new Date(),
        userId: 'test-user-id',
      };

      jest
        .requireMock('../utils/ProviderTokenVault')
        .getProviderToken.mockResolvedValueOnce({
          success: true,
          token: mockToken,
        });

      let contextValue: ReturnType<typeof useDepositSDK> | undefined;
      const TestComponent = () => {
        contextValue = useDepositSDK();
        return null;
      };

      renderWithProvider(
        <DepositSDKProvider>
          <TestComponent />
        </DepositSDKProvider>,
        {
          state: mockedState,
        },
      );

      expect(contextValue?.isAuthenticated).toBe(false);

      const result = await act(
        async () => await contextValue?.checkExistingToken(),
      );
      expect(result).toBe(true);
      expect(contextValue?.isAuthenticated).toBe(true);
      expect(contextValue?.authToken).toEqual(mockToken);
      jest.requireMock('../utils/ProviderTokenVault').getProviderToken =
        originalMock;
    });
    it('clears authentication state when calling clearAuthToken', async () => {
      const resetProviderTokenMock = jest.fn().mockResolvedValue(undefined);
      jest.requireMock('../utils/ProviderTokenVault').resetProviderToken =
        resetProviderTokenMock;

      const clearAccessTokenMock = jest.fn();
      (NativeRampsSdk as jest.Mock).mockImplementationOnce(() => ({
        setAccessToken: jest.fn(),
        clearAccessToken: clearAccessTokenMock,
      }));

      let contextValue: ReturnType<typeof useDepositSDK> | undefined;
      const TestComponent = () => {
        contextValue = useDepositSDK();
        return <Text>Test Component</Text>;
      };

      renderWithProvider(
        <DepositSDKProvider>
          <TestComponent />
        </DepositSDKProvider>,
        { state: mockedState },
      );

      const mockToken = {
        id: 'test-token-id',
        accessToken: 'test-token',
        ttl: 3600,
        created: new Date(),
        userId: 'test-user-id',
      };

      await act(async () => {
        await contextValue?.setAuthToken(mockToken);
      });

      expect(contextValue?.isAuthenticated).toBe(true);
      expect(contextValue?.authToken).toEqual(mockToken);

      await act(async () => {
        contextValue?.clearAuthToken();
      });

      expect(resetProviderTokenMock).toHaveBeenCalled();
      expect(clearAccessTokenMock).toHaveBeenCalled();
      expect(contextValue?.isAuthenticated).toBe(false);
      expect(contextValue?.authToken).toBeUndefined();
    });
  });
});
