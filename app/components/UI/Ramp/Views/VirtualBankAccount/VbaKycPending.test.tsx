import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaKycPending, { VbaKycPendingSelectorsIDs } from './VbaKycPending';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    canGoBack: mockCanGoBack,
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

describe('VbaKycPending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
  });

  it('renders the verification copy and illustration', () => {
    const { getByTestId, getByText } = renderWithProvider(<VbaKycPending />);

    expect(getByTestId(VbaKycPendingSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(
      getByTestId(VbaKycPendingSelectorsIDs.ILLUSTRATION),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_taking_longer.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_taking_longer.description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_taking_longer.button')),
    ).toBeOnTheScreen();
  });

  it('goes back when Come back later is pressed and there is a previous screen', () => {
    const { getByTestId } = renderWithProvider(<VbaKycPending />);

    fireEvent.press(
      getByTestId(VbaKycPendingSelectorsIDs.COME_BACK_LATER_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens Money home when Come back later is pressed without a previous screen', () => {
    mockCanGoBack.mockReturnValue(false);
    const { getByTestId } = renderWithProvider(<VbaKycPending />);

    fireEvent.press(
      getByTestId(VbaKycPendingSelectorsIDs.COME_BACK_LATER_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
