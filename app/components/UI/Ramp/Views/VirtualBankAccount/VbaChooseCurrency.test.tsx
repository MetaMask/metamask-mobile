import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaChooseCurrency from './VbaChooseCurrency';
import { VbaChooseCurrencySelectorsIDs } from './VbaChooseCurrency.testIds';
import { openCompletedVbaAccount } from './hooks/useVbaOnboardingRouting';

const mockGoBack = jest.fn();
const mockNavigation = { goBack: mockGoBack };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('./hooks/useVbaOnboardingRouting', () => ({
  openCompletedVbaAccount: jest.fn(),
}));

const mockOpenCompletedVbaAccount = jest.mocked(openCompletedVbaAccount);

describe('VbaChooseCurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists every supported currency, including EUR', () => {
    const { getByTestId } = renderWithProvider(<VbaChooseCurrency />);

    (['BRL', 'USD', 'EUR'] as const).forEach((currency) => {
      expect(
        getByTestId(
          `${VbaChooseCurrencySelectorsIDs.CURRENCY_ROW}-${currency}`,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('opens account details when a currency is pressed', () => {
    const { getByTestId } = renderWithProvider(<VbaChooseCurrency />);

    fireEvent.press(
      getByTestId(`${VbaChooseCurrencySelectorsIDs.CURRENCY_ROW}-EUR`),
    );

    expect(mockOpenCompletedVbaAccount).toHaveBeenCalledWith(mockNavigation);
  });

  it('goes back from the header', () => {
    const { getByTestId } = renderWithProvider(<VbaChooseCurrency />);

    fireEvent.press(getByTestId(VbaChooseCurrencySelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
