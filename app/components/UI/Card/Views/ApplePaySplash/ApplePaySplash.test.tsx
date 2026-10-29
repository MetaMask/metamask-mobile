import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ApplePaySplash from './ApplePaySplash';

const mockGoBack = jest.fn();
const mockInitiateProvisioning = jest.fn().mockResolvedValue(undefined);
let mockIsProvisioning = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
}));

jest.mock('../CardHome/hooks/useCardWalletProvisioning', () => ({
  useCardWalletProvisioning: () => ({
    initiateProvisioning: mockInitiateProvisioning,
    canAddToWallet: true,
    isProvisioning: mockIsProvisioning,
  }),
}));

jest.mock('../../pushProvisioning/components/AddToWalletButton', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { Pressable } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AddToWalletButton: ({
      onPress,
      testID,
      buttonStyle,
    }: {
      onPress?: () => void;
      testID?: string;
      buttonStyle?: string;
    }) =>
      ReactActual.createElement(Pressable, {
        testID,
        onPress,
        accessibilityHint: buttonStyle,
      }),
  };
});

describe('ApplePaySplash', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockInitiateProvisioning.mockClear();
    mockIsProvisioning = false;
  });

  it('shows the splash copy and adds the card to Apple Wallet', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ApplePaySplash />,
    );

    expect(getByTestId('apple-pay-splash-title')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-splash-description')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-splash-no-downloads')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-splash-setup')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-splash-hero')).toBeOnTheScreen();
    expect(queryByTestId('apple-pay-splash-lockup-light')).toBeNull();

    fireEvent.press(getByTestId('apple-pay-splash-add'));

    expect(mockInitiateProvisioning).toHaveBeenCalledTimes(1);
  });

  it('hides Add to Apple Wallet while a pass is being added', () => {
    mockIsProvisioning = true;
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ApplePaySplash />,
    );

    expect(queryByTestId('apple-pay-splash-add')).toBeNull();
    expect(getByTestId('apple-pay-splash-spinner')).toBeOnTheScreen();
    expect(mockInitiateProvisioning).not.toHaveBeenCalled();
  });

  it('uses the same outlined button as Card Home', () => {
    const { getByTestId } = renderWithProvider(<ApplePaySplash />);

    expect(getByTestId('apple-pay-splash-add')).toHaveProp(
      'accessibilityHint',
      'blackOutline',
    );
  });

  it('returns to Card Home when closed', () => {
    const { getByTestId } = renderWithProvider(<ApplePaySplash />);

    fireEvent.press(getByTestId('apple-pay-splash-close'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
