import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  VbaKycPending,
  VbaKycRejected,
  VbaOnboardingError,
  VbaOnboardingStubSelectorsIDs,
} from './VbaOnboardingStub';
import { useResumeVbaOnboarding } from './hooks/useVbaOnboardingRouting';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  }),
}));

jest.mock('./hooks/useVbaOnboardingRouting', () => ({
  useResumeVbaOnboarding: jest.fn(),
}));

const mockUseResumeVbaOnboarding = jest.mocked(useResumeVbaOnboarding);
const mockResumeOnboarding = jest.fn();

describe('VbaOnboardingStub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResumeOnboarding.mockResolvedValue(undefined);
    mockUseResumeVbaOnboarding.mockReturnValue(mockResumeOnboarding);
  });

  it.each([
    ['kyc pending', VbaKycPending, 'vba-onboarding-stub-container-kyc_pending'],
    [
      'kyc rejected',
      VbaKycRejected,
      'vba-onboarding-stub-container-kyc_rejected',
    ],
    [
      'onboarding error',
      VbaOnboardingError,
      'vba-onboarding-stub-container-error',
    ],
  ] as const)('renders the %s stub', (_label, Screen, testId) => {
    const { getByTestId } = renderWithProvider(<Screen />);

    expect(getByTestId(testId)).toBeOnTheScreen();
  });

  it('rehydrates on continue instead of hardcoding the next screen', async () => {
    const { getByTestId } = renderWithProvider(<VbaKycPending />);

    fireEvent.press(getByTestId(VbaOnboardingStubSelectorsIDs.CONTINUE_BUTTON));

    expect(mockUseResumeVbaOnboarding).toHaveBeenCalledWith('kyc_pending-retry');
    await waitFor(() => {
      expect(mockResumeOnboarding).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderWithProvider(<VbaOnboardingError />);

    fireEvent.press(getByTestId(VbaOnboardingStubSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
