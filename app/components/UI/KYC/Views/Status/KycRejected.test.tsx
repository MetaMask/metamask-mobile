import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaKycRejected, { VbaKycRejectedSelectorsIDs } from './KycRejected';
import { VbaOnboardingErrorSelectorsIDs } from '../../components/OnboardingError';

const mockGoBack = jest.fn();
const mockOnAction = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

describe('VbaKycRejected', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAction.mockResolvedValue(undefined);
  });

  it('renders contact support guidance when verification is rejected', () => {
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <VbaKycRejected action="contactSupport" onAction={mockOnAction} />,
    );

    expect(getByTestId(VbaKycRejectedSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(VbaOnboardingErrorSelectorsIDs.LIST)).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.button')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(VbaKycRejectedSelectorsIDs.RETRY_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      getByText(
        strings(
          'virtual_bank_account.kyc_rejected.identity_document_description',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.kyc_rejected.selfie_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.kyc_rejected.details_description'),
      ),
    ).toBeOnTheScreen();
  });

  it('calls onAction when contact support is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <VbaKycRejected action="contactSupport" onAction={mockOnAction} />,
    );

    fireEvent.press(
      getByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    );

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onAction when Try again is pressed for a retryable session', async () => {
    const { getByTestId, getByText } = renderWithProvider(
      <VbaKycRejected action="retry" onAction={mockOnAction} />,
    );

    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.retry_description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.retry_button')),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(VbaKycRejectedSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderWithProvider(
      <VbaKycRejected action="contactSupport" onAction={mockOnAction} />,
    );

    fireEvent.press(getByTestId(VbaKycRejectedSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
