import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KycRejected, { KycRejectedSelectorsIDs } from './KycRejected';
import { KycOnboardingErrorSelectorsIDs } from '../../components/OnboardingError';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';

jest.mock('../../hooks/useTrackKycResultViewed');

const mockGoBack = jest.fn();
const mockOnAction = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

describe('KycRejected', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAction.mockResolvedValue(undefined);
  });

  it('renders contact support guidance when verification is rejected', () => {
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <KycRejected action="contactSupport" onAction={mockOnAction} />,
    );

    expect(getByTestId(KycRejectedSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(KycOnboardingErrorSelectorsIDs.LIST)).toBeOnTheScreen();
    expect(getByText(strings('kyc.kyc_rejected.title'))).toBeOnTheScreen();
    expect(
      getByText(strings('kyc.kyc_rejected.description')),
    ).toBeOnTheScreen();
    expect(getByText(strings('kyc.kyc_rejected.button'))).toBeOnTheScreen();
    expect(
      queryByTestId(KycRejectedSelectorsIDs.RETRY_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      getByText(strings('kyc.kyc_rejected.identity_document_description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('kyc.kyc_rejected.selfie_description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('kyc.kyc_rejected.details_description')),
    ).toBeOnTheScreen();
  });

  it('calls onAction when contact support is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <KycRejected action="contactSupport" onAction={mockOnAction} />,
    );

    fireEvent.press(
      getByTestId(KycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    );

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onAction when Try again is pressed for a retryable session', async () => {
    const { getByTestId, getByText } = renderWithProvider(
      <KycRejected action="retry" onAction={mockOnAction} />,
    );

    expect(
      getByText(strings('kyc.kyc_rejected.retry_description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('kyc.kyc_rejected.retry_button')),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(KycRejectedSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderWithProvider(
      <KycRejected action="contactSupport" onAction={mockOnAction} />,
    );

    fireEvent.press(getByTestId(KycRejectedSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('reports the rejected result as viewed', () => {
    renderWithProvider(
      <KycRejected action="contactSupport" onAction={mockOnAction} />,
    );

    expect(useTrackKycResultViewed).toHaveBeenCalledWith('rejected');
  });
});
