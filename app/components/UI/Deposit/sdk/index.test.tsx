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
  });

  describe('useDepositSDK', () => {
    it('returns the correct context values', () => {
      const TestComponent = () => {
        const { providerApiKey, providerFrontendAuth } = useDepositSDK();
        return (
          <Text>
            {`API Key: ${providerApiKey}, Frontend Auth: ${providerFrontendAuth}`}
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
      expect(screen.toJSON()).toMatchSnapshot();
      const textElement = screen.getByText(
        'API Key: test-provider-api-key, Frontend Auth: test-provider-frontend-auth',
      );
      expect(textElement).toBeOnTheScreen();
    });
  });
});
