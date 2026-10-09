import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaOnboardingLoading, {
  VbaOnboardingLoadingSelectorsIDs,
} from './VbaOnboardingLoading';
import { VbaOnboardingStubSelectorsIDs } from './VbaOnboardingStub';
import {
  navigateToVbaOnboardingDestination,
  resolveVbaOnboarding,
} from './hooks/useVbaOnboardingRouting';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from './vbaOnboardingSnapshot';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('./hooks/useVbaOnboardingRouting', () => ({
  resolveVbaOnboarding: jest.fn(),
  navigateToVbaOnboardingDestination: jest.fn(),
}));

const mockResolve = jest.mocked(resolveVbaOnboarding);
const mockNavigateToDestination = jest.mocked(
  navigateToVbaOnboardingDestination,
);

const pending = () =>
  new Promise<Awaited<ReturnType<typeof resolveVbaOnboarding>>>(
    () => undefined,
  );

describe('VbaOnboardingLoading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolve.mockReturnValue(pending());
  });

  it('shows a spinner and back button while status is loading', () => {
    const { getByTestId } = renderWithProvider(<VbaOnboardingLoading />);

    expect(
      getByTestId(VbaOnboardingLoadingSelectorsIDs.SPINNER),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(VbaOnboardingLoadingSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('opens vendor terms when hydrate returns an empty snapshot', async () => {
    const snapshot = { ...EMPTY_VBA_ONBOARDING_SNAPSHOT };
    mockResolve.mockResolvedValue({
      status: 'ready',
      destinationId: 'vendorTerms',
      snapshot,
    });

    renderWithProvider(<VbaOnboardingLoading />);

    await waitFor(() => {
      expect(mockNavigateToDestination).toHaveBeenCalledWith(
        expect.anything(),
        'vendorTerms',
        snapshot,
      );
    });
  });

  it('passes the snapshot when identity verification is the destination', async () => {
    const snapshot = {
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      vendorTermsAcceptedLocally: true,
    };
    mockResolve.mockResolvedValue({
      status: 'ready',
      destinationId: 'identityVerification',
      snapshot,
    });

    renderWithProvider(<VbaOnboardingLoading />);

    await waitFor(() => {
      expect(mockNavigateToDestination).toHaveBeenCalledWith(
        expect.anything(),
        'identityVerification',
        snapshot,
      );
    });
  });

  it('shows the error stub and retries in place', async () => {
    let shouldFail = true;
    mockResolve.mockImplementation(async () => {
      if (shouldFail) {
        return { status: 'error' };
      }
      return {
        status: 'ready' as const,
        destinationId: 'email' as const,
        snapshot: {
          ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
          vendorTermsAcceptedLocally: true,
        },
      };
    });

    const { getByTestId } = renderWithProvider(<VbaOnboardingLoading />);

    await waitFor(() => {
      expect(
        getByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
      ).toBeOnTheScreen();
    });
    expect(mockNavigateToDestination).not.toHaveBeenCalled();

    shouldFail = false;
    fireEvent.press(getByTestId(VbaOnboardingStubSelectorsIDs.CONTINUE_BUTTON));

    await waitFor(() => {
      expect(mockNavigateToDestination).toHaveBeenCalledWith(
        expect.anything(),
        'email',
        expect.objectContaining({ vendorTermsAcceptedLocally: true }),
      );
    });
  });

  it('does not navigate when the screen unmounts before hydrate resolves', async () => {
    let finish: (
      value: Awaited<ReturnType<typeof resolveVbaOnboarding>>,
    ) => void = () => undefined;
    mockResolve.mockReturnValue(
      new Promise<Awaited<ReturnType<typeof resolveVbaOnboarding>>>(
        (resolve) => {
          finish = resolve;
        },
      ),
    );

    const { unmount } = renderWithProvider(<VbaOnboardingLoading />);
    unmount();

    finish({
      status: 'ready',
      destinationId: 'vendorTerms',
      snapshot: { ...EMPTY_VBA_ONBOARDING_SNAPSHOT },
    });

    await waitFor(() => {
      expect(mockResolve).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigateToDestination).not.toHaveBeenCalled();
  });
});
