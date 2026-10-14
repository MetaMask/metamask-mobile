import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AppThemeKey } from '../../../../../util/theme/models';
import { mockTheme } from '../../../../../util/theme';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ApplePayConfirmation from './ApplePayConfirmation';

const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    reset: mockReset,
  }),
}));

describe('ApplePayConfirmation', () => {
  beforeEach(() => {
    mockReset.mockClear();
  });

  it('shows the success copy and light payment marks', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <ApplePayConfirmation />,
    );

    expect(getByText("You're all set")).toBeOnTheScreen();
    expect(
      getByText('Your card has been added to Apple Wallet.'),
    ).toBeOnTheScreen();
    expect(
      getByText(
        'Apple Pay is an easy, secure way to pay with your card on all your Apple devices—in-store, online, or in-app.',
      ),
    ).toBeOnTheScreen();
    expect(getByTestId('apple-pay-confirmation-check')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-confirmation-marks-light')).toBeOnTheScreen();
  });

  it('uses the dark payment marks', () => {
    const { getByTestId } = renderWithProvider(<ApplePayConfirmation />, {
      theme: { ...mockTheme, themeAppearance: AppThemeKey.dark },
    });

    expect(getByTestId('apple-pay-confirmation-marks-dark')).toBeOnTheScreen();
  });

  it('returns to Card Home when done', () => {
    const { getByTestId } = renderWithProvider(<ApplePayConfirmation />);

    fireEvent.press(getByTestId('apple-pay-confirmation-done'));

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'CardHome' }],
    });
  });
});
