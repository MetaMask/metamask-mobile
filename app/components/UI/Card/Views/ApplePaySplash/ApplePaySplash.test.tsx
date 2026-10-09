import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AppThemeKey } from '../../../../../util/theme/models';
import { mockTheme } from '../../../../../util/theme';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ApplePaySplash from './ApplePaySplash';

const mockGoBack = jest.fn();
const mockReplace = jest.fn();
const mockInitiateProvisioning = jest.fn();

const mockProvisioningState: {
  isProvisioning: boolean;
  onSuccess?: () => void;
} = {
  isProvisioning: false,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    replace: mockReplace,
  }),
}));

jest.mock('../../hooks/useCardHomeData', () => ({
  useCardHomeData: () => ({ data: null }),
}));

jest.mock('../CardHome/hooks/useCardWalletProvisioning', () => ({
  useCardWalletProvisioning: (
    _data: unknown,
    options?: { onSuccess?: () => void },
  ) => {
    mockProvisioningState.onSuccess = options?.onSuccess;
    return {
      initiateProvisioning: mockInitiateProvisioning,
      isProvisioning: mockProvisioningState.isProvisioning,
    };
  },
}));

jest.mock('../../pushProvisioning/components/AddToWalletButton', () => {
  const MockReact = jest.requireActual<typeof import('react')>('react');
  const { Pressable } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AddToWalletButton: ({
      onPress,
      testID,
      buttonStyle,
      style,
    }: {
      onPress: () => void;
      testID?: string;
      buttonStyle?: string;
      style?: { borderColor?: string };
    }) =>
      MockReact.createElement(Pressable, {
        onPress,
        testID,
        accessibilityLabel: buttonStyle,
        style,
      }),
  };
});

describe('ApplePaySplash', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockReplace.mockClear();
    mockInitiateProvisioning.mockClear();
    mockProvisioningState.isProvisioning = false;
    mockProvisioningState.onSuccess = undefined;
  });

  it('shows the light design and starts Apple Wallet provisioning', () => {
    const { getByText, getByTestId, getByLabelText } = renderWithProvider(
      <ApplePaySplash />,
    );

    expect(
      getByText('Your iPhone is now your MetaMask card.'),
    ).toBeOnTheScreen();
    expect(getByTestId('apple-pay-splash-lockup-light')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-splash-hero')).toBeOnTheScreen();
    expect(getByLabelText('black')).toBeOnTheScreen();
    expect(
      getByTestId('apple-pay-splash-add-to-wallet').props.style,
    ).toBeUndefined();

    fireEvent.press(getByTestId('apple-pay-splash-add-to-wallet'));

    expect(mockInitiateProvisioning).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('uses the dark assets and outlined wallet button', () => {
    const { getByTestId, getByLabelText } = renderWithProvider(
      <ApplePaySplash />,
      {
        theme: { ...mockTheme, themeAppearance: AppThemeKey.dark },
      },
    );

    expect(getByTestId('apple-pay-splash-lockup-dark')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-splash-hero')).toBeOnTheScreen();
    expect(getByLabelText('blackOutline')).toBeOnTheScreen();
    expect(
      getByTestId('apple-pay-splash-add-to-wallet').props.style,
    ).toBeUndefined();
  });

  it('returns to Card Home when closed', () => {
    const { getByTestId } = renderWithProvider(<ApplePaySplash />);

    fireEvent.press(getByTestId('apple-pay-splash-close'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('opens the confirmation screen after the card is added', () => {
    renderWithProvider(<ApplePaySplash />);

    mockProvisioningState.onSuccess?.();

    expect(mockReplace).toHaveBeenCalledWith('CardApplePayConfirmation');
  });

  it('shows a spinner while provisioning', () => {
    mockProvisioningState.isProvisioning = true;
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ApplePaySplash />,
    );

    expect(getByTestId('apple-pay-splash-spinner')).toBeOnTheScreen();
    expect(queryByTestId('apple-pay-splash-add-to-wallet')).toBeNull();
  });
});
