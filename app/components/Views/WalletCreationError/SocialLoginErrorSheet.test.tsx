import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Linking, Image, SafeAreaView } from 'react-native';
import SocialLoginErrorSheet from './SocialLoginErrorSheet';
import Routes from '../../../constants/navigation/Routes';
import AppConstants from '../../../core/AppConstants';
import renderWithProvider from '../../../util/test/renderWithProvider';

const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      reset: mockReset,
    }),
  };
});

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../../../core', () => ({
  Authentication: {
    deleteWallet: jest.fn().mockResolvedValue(undefined),
  },
}));

import { Authentication } from '../../../core';

describe('SocialLoginErrorSheet', () => {
  const mockError = new Error('Test social login error');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders title text', () => {
      const { getByText } = renderWithProvider(
        <SocialLoginErrorSheet error={mockError} />,
      );

      expect(getByText('Something went wrong')).toBeTruthy();
    });

    it('renders description text', () => {
      const { getByText } = renderWithProvider(
        <SocialLoginErrorSheet error={mockError} />,
      );

      expect(
        getByText(
          /An error occurred while creating your wallet\. Try again and if the issue persists, contact/,
        ),
      ).toBeTruthy();
    });

    it('renders Try again button', () => {
      const { getByText } = renderWithProvider(
        <SocialLoginErrorSheet error={mockError} />,
      );

      expect(getByText('Try again')).toBeTruthy();
    });

    it('renders MetaMask Support link', () => {
      const { getByText } = renderWithProvider(
        <SocialLoginErrorSheet error={mockError} />,
      );

      expect(getByText('MetaMask Support')).toBeTruthy();
    });

    it('renders without error prop', () => {
      const { getByText } = renderWithProvider(<SocialLoginErrorSheet />);

      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText('Try again')).toBeTruthy();
    });

    it('renders Fox logo image', () => {
      const { UNSAFE_getByType } = renderWithProvider(
        <SocialLoginErrorSheet error={mockError} />,
      );

      const image = UNSAFE_getByType(Image);
      expect(image).toBeTruthy();
    });

    it('renders SafeAreaView container', () => {
      const { UNSAFE_getByType } = renderWithProvider(
        <SocialLoginErrorSheet error={mockError} />,
      );

      const container = UNSAFE_getByType(SafeAreaView);
      expect(container).toBeTruthy();
    });
  });

  describe('handleTryAgain', () => {
    it('deletes wallet and navigates to onboarding root when Try again is pressed', async () => {
      const { getByText } = renderWithProvider(
        <SocialLoginErrorSheet error={mockError} />,
      );

      fireEvent.press(getByText('Try again'));

      // Wait for async deleteWallet to complete
      await Promise.resolve();

      expect(Authentication.deleteWallet).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalledWith({
        routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
      });
    });
  });

  describe('handleContactSupport', () => {
    it('opens support URL when MetaMask Support is pressed', () => {
      const { getByText } = renderWithProvider(
        <SocialLoginErrorSheet error={mockError} />,
      );

      fireEvent.press(getByText('MetaMask Support'));

      expect(Linking.openURL).toHaveBeenCalledWith(
        AppConstants.REVIEW_PROMPT.SUPPORT,
      );
    });
  });
});
