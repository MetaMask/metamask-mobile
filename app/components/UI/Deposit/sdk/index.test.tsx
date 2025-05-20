import React, { useContext } from 'react';
import { Text } from 'react-native';
import { screen } from '@testing-library/react-native';
import {
  DepositSDK,
  DepositSDKContext,
  DepositSDKProvider,
  useDepositSDK,
} from '.';
import { backgroundState } from '../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../util/test/renderWithProvider';

declare module '@consensys/native-ramps-sdk' {
  interface NativeRampsSdk {
    initializeSdk: () => Promise<void>;
    getProviders: () => Promise<string[]>;
    getQuote: () => Promise<{ id: string; amount: number }>;
  }
}

jest.mock('@consensys/native-ramps-sdk', () => ({
  NativeRampsSdk: jest.fn().mockImplementation(() => ({
    initializeSdk: jest.fn().mockResolvedValue(undefined),
    getProviders: jest.fn().mockResolvedValue(['provider1', 'provider2']),
    getQuote: jest.fn().mockResolvedValue({ id: 'quote-id', amount: 100 }),
  })),
}));

import { NativeRampsSdk } from '@consensys/native-ramps-sdk';

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
};

describe('Deposit SDK Context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      expect(NativeRampsSdk).toHaveBeenCalledWith({
        partnerApiKey: 'test-provider-api-key',
        frontendAuth: 'test-provider-frontend-auth',
      });
    });
  });

  describe('useDepositSDK', () => {
    it('provides access to the NativeRampsSdk instance', () => {
      const TestComponent = () => {
        const { sdk } = useDepositSDK();

        React.useEffect(() => {
          if (sdk) {
            sdk.getProviders();
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
      const textElement = screen.getByText(
        'API Key: test-provider-api-key, Frontend Auth: test-provider-frontend-auth',
      );
      expect(textElement).toBeOnTheScreen();
    });

    it('allows calling SDK methods through the context', async () => {
      const TestComponent = () => {
        const { sdk } = useDepositSDK();
        return (
          <Text testID="sdk-test" onPress={() => sdk?.getQuote()}>
            Test SDK
          </Text>
        );
      };

      renderWithProvider(
        <DepositSDKProvider>
          <TestComponent />
        </DepositSDKProvider>,
        {
          state: mockedState,
        },
      );

      const mockSdkInstance = (NativeRampsSdk as jest.Mock).mock.results[0]
        .value;
      expect(mockSdkInstance.getProviders).toHaveBeenCalled();
    });
  });

  describe('NativeRampsSdk integration', () => {
    it('allows calling SDK methods through the context', async () => {
      const TestComponent = () => {
        const { sdk } = useDepositSDK();
        return (
          <Text testID="sdk-test" onPress={() => sdk?.getQuote()}>
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
      expect(mockSdkInstance.getQuote).toHaveBeenCalled();
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
});
