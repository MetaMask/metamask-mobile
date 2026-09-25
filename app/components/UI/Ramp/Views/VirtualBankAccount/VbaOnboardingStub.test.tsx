import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaOnboardingStub, {
  type VbaOnboardingStubVariant,
  VbaOnboardingStubSelectorsIDs,
} from './VbaOnboardingStub';

const mockGoBack = jest.fn();
const mockOnContinue = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

describe('VbaOnboardingStub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnContinue.mockResolvedValue(undefined);
  });

  it.each([
    ['kyc_pending', 'vba-onboarding-stub-container-kyc_pending'],
    ['kyc_rejected', 'vba-onboarding-stub-container-kyc_rejected'],
    [
      'account_provisioning_error',
      'vba-onboarding-stub-container-account_provisioning_error',
    ],
    ['error', 'vba-onboarding-stub-container-error'],
  ] as const)('renders the %s stub', (variant, testId) => {
    const { getByTestId } = renderWithProvider(
      <VbaOnboardingStub
        variant={variant as VbaOnboardingStubVariant}
        onContinue={mockOnContinue}
      />,
    );

    expect(getByTestId(testId)).toBeOnTheScreen();
  });

  it('reports continue to its adapter', async () => {
    const { getByTestId } = renderWithProvider(
      <VbaOnboardingStub variant="kyc_pending" onContinue={mockOnContinue} />,
    );

    fireEvent.press(getByTestId(VbaOnboardingStubSelectorsIDs.CONTINUE_BUTTON));

    await waitFor(() => {
      expect(mockOnContinue).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderWithProvider(
      <VbaOnboardingStub variant="error" onContinue={mockOnContinue} />,
    );

    fireEvent.press(getByTestId(VbaOnboardingStubSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
