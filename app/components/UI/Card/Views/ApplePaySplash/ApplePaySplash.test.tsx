import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AppThemeKey } from '../../../../../util/theme/models';
import { mockTheme } from '../../../../../util/theme';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ApplePaySplash from './ApplePaySplash';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

describe('ApplePaySplash', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('shows the light design and continues to Card Home', () => {
    const { getByText, getByTestId } = renderWithProvider(<ApplePaySplash />);

    expect(
      getByText('Your iPhone is now your MetaMask card.'),
    ).toBeOnTheScreen();
    expect(getByTestId('apple-pay-splash-lockup-light')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-splash-hero')).toBeOnTheScreen();
    expect(getByText('Continue')).toBeOnTheScreen();

    fireEvent.press(getByTestId('apple-pay-splash-continue'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('uses the dark lockup', () => {
    const { getByTestId } = renderWithProvider(<ApplePaySplash />, {
      theme: { ...mockTheme, themeAppearance: AppThemeKey.dark },
    });

    expect(getByTestId('apple-pay-splash-lockup-dark')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-splash-hero')).toBeOnTheScreen();
  });

  it('returns to Card Home when closed', () => {
    const { getByTestId } = renderWithProvider(<ApplePaySplash />);

    fireEvent.press(getByTestId('apple-pay-splash-close'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
