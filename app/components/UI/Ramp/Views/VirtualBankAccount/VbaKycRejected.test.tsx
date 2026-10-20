import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaKycRejected, { VbaKycRejectedSelectorsIDs } from './VbaKycRejected';

const mockGoBack = jest.fn();
const mockOnRetry = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

describe('VbaKycRejected', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnRetry.mockResolvedValue(undefined);
  });

  it('renders the verification failure copy', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <VbaKycRejected onRetry={mockOnRetry} />,
    );

    expect(getByTestId(VbaKycRejectedSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.button')),
    ).toBeOnTheScreen();
  });

  it('calls onRetry when Try again is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <VbaKycRejected onRetry={mockOnRetry} />,
    );

    fireEvent.press(getByTestId(VbaKycRejectedSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderWithProvider(
      <VbaKycRejected onRetry={mockOnRetry} />,
    );

    fireEvent.press(getByTestId(VbaKycRejectedSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
