import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaKycPending, { VbaKycPendingSelectorsIDs } from './VbaKycPending';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('VbaKycPending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the verifying status', () => {
    const { getByTestId, getByText } = renderWithProvider(<VbaKycPending />);

    expect(getByTestId(VbaKycPendingSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_verifying.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_verifying.description')),
    ).toBeOnTheScreen();
  });

  it('returns to Money home', () => {
    const { getByTestId } = renderWithProvider(<VbaKycPending />);

    fireEvent.press(
      getByTestId(VbaKycPendingSelectorsIDs.COME_BACK_LATER_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });
});
