import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import VbaKycNeedInfo, { VbaKycNeedInfoSelectorsIDs } from './VbaKycNeedInfo';

const mockGoBack = jest.fn();
const mockOnContinue = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

describe('VbaKycNeedInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the more information needed title, description, and button', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <VbaKycNeedInfo onContinue={mockOnContinue} />,
    );

    expect(getByTestId(VbaKycNeedInfoSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_need_info.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_need_info.description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_need_info.button')),
    ).toBeOnTheScreen();
  });

  it('calls onContinue when continue is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <VbaKycNeedInfo onContinue={mockOnContinue} />,
    );

    fireEvent.press(getByTestId(VbaKycNeedInfoSelectorsIDs.CONTINUE_BUTTON));

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderWithProvider(
      <VbaKycNeedInfo onContinue={mockOnContinue} />,
    );

    fireEvent.press(getByTestId(VbaKycNeedInfoSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
