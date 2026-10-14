import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaKycPending, { VbaKycPendingSelectorsIDs } from './VbaKycPending';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    canGoBack: () => true,
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
}));

describe('VbaKycPending', () => {
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
});
