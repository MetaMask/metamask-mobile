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

    expect(getByText('Card Added Successfully')).toBeOnTheScreen();
    expect(
      getByText(
        'Simply double-click the Side Button or Home Button at anytime to pay, even from Lock Screen or while using other apps. Try it now.',
      ),
    ).toBeOnTheScreen();
    expect(
      getByText('Use Apple Pay anywhere you see these marks below.'),
    ).toBeOnTheScreen();
    expect(getByTestId('apple-pay-confirmation-graphic')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-confirmation-hand')).toBeOnTheScreen();
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
