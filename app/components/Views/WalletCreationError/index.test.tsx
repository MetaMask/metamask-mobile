import React from 'react';
import { render } from '@testing-library/react-native';
import WalletCreationError from './index';

const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: () => mockUseRoute(),
  };
});

jest.mock('./SocialLoginErrorSheet', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockSocialLoginErrorSheet() {
    return (
      <View testID="social-login-error-sheet">
        <Text>SocialLoginErrorSheet</Text>
      </View>
    );
  };
});

jest.mock('./SRPErrorScreen', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockSRPErrorScreen() {
    return (
      <View testID="srp-error-screen">
        <Text>SRPErrorScreen</Text>
      </View>
    );
  };
});

describe('WalletCreationError', () => {
  const mockError = new Error('Test error');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('routing based on metricsEnabled (consent status)', () => {
    it('renders SocialLoginErrorSheet when metricsEnabled is true', () => {
      mockUseRoute.mockReturnValue({
        params: { metricsEnabled: true, error: mockError },
      });

      const { getByTestId, queryByTestId } = render(<WalletCreationError />);

      expect(getByTestId('social-login-error-sheet')).toBeTruthy();
      expect(queryByTestId('srp-error-screen')).toBeNull();
    });

    it('renders SRPErrorScreen when metricsEnabled is false', () => {
      mockUseRoute.mockReturnValue({
        params: { metricsEnabled: false, error: mockError },
      });

      const { getByTestId, queryByTestId } = render(<WalletCreationError />);

      expect(getByTestId('srp-error-screen')).toBeTruthy();
      expect(queryByTestId('social-login-error-sheet')).toBeNull();
    });

    it('renders SRPErrorScreen when metricsEnabled is undefined', () => {
      mockUseRoute.mockReturnValue({
        params: { error: mockError },
      });

      const { getByTestId, queryByTestId } = render(<WalletCreationError />);

      expect(getByTestId('srp-error-screen')).toBeTruthy();
      expect(queryByTestId('social-login-error-sheet')).toBeNull();
    });

    it('renders SRPErrorScreen when params is undefined', () => {
      mockUseRoute.mockReturnValue({});

      const { getByTestId } = render(<WalletCreationError />);

      expect(getByTestId('srp-error-screen')).toBeTruthy();
    });
  });
});
