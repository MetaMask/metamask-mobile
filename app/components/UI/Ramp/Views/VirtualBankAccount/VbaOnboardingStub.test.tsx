import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  VbaKycPending,
  VbaKycRejected,
  VbaOnboardingError,
  VbaOnboardingStubSelectorsIDs,
} from './VbaOnboardingStub';
import { hydrateAndNavigateVbaOnboarding } from './hydrateAndNavigateVbaOnboarding';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  }),
}));

jest.mock('./hydrateAndNavigateVbaOnboarding', () => ({
  hydrateAndNavigateVbaOnboarding: jest.fn(),
}));

const mockHydrateAndNavigate = jest.mocked(hydrateAndNavigateVbaOnboarding);

describe('VbaOnboardingStub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateAndNavigate.mockResolvedValue(undefined);
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

    await waitFor(() => {
      expect(mockHydrateAndNavigate).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderWithProvider(<VbaOnboardingError />);

    fireEvent.press(getByTestId(VbaOnboardingStubSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
