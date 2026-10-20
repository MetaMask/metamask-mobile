import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ApplePaySplash from './ApplePaySplash';

const mockGoBack = jest.fn();
const mockInitiateProvisioning = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
  useRoute: () => ({ params: { source: 'card' } }),
}));

jest.mock('./useApplePayHomeEligibility', () => ({
  useApplePayHomeEligibility: () => ({
    mode: 'none',
    showSplash: false,
    showBanner: false,
    showRegionLine: false,
  }),
}));

jest.mock('../CardHome/hooks/useCardWalletProvisioning', () => ({
  useCardWalletProvisioning: () => ({
    initiateProvisioning: mockInitiateProvisioning,
    canAddToWallet: true,
  }),
}));

jest.mock('../../pushProvisioning/components/AddToWalletButton', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AddToWalletButton: ({
      onPress,
      testID,
    }: {
      onPress?: () => void;
      testID?: string;
    }) => React.createElement(Pressable, { testID, onPress }),
  };
});

describe('ApplePaySplash', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('shows the splash copy and continues to Card Home', () => {
    const { getByText, getByTestId, queryByTestId } = renderWithProvider(
      <ApplePaySplash />,
    );

    expect(getByText('MetaMask with Apple Pay')).toBeOnTheScreen();
    expect(
      getByText(
        'Apple Pay is an easy, secure, and private way to pay with your iPhone and Apple Watch.',
      ),
    ).toBeOnTheScreen();
    expect(
      getByText('There are no additional app downloads, sign ups, or fees.'),
    ).toBeOnTheScreen();
    expect(getByText('Get set up in seconds.')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-splash-hero')).toBeOnTheScreen();
    expect(queryByTestId('apple-pay-splash-lockup-light')).toBeNull();

    fireEvent.press(getByTestId('apple-pay-splash-add'));

    expect(mockInitiateProvisioning).toHaveBeenCalledTimes(1);
  });

  it('returns to Card Home when closed', () => {
    const { getByTestId } = renderWithProvider(<ApplePaySplash />);

    fireEvent.press(getByTestId('apple-pay-splash-close'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
