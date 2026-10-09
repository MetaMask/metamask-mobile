import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';
import Engine from '../../../../../../core/Engine';
import type { RootState } from '../../../../../../reducers';
import {
  selectCanonicalProfileId,
  selectIsSignedIn,
} from '../../../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import { selectSeedlessOnboardingUserId } from '../../../../../../selectors/seedlessOnboardingController';
import configureStore from '../../../../../../util/test/configureStore';
import { useMoneyAccountPlusTrialEligibility } from './useMoneyAccountPlusTrialEligibility';

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    SubscriptionController: {
      isUserEligibleForTrial: jest.fn(),
    },
  },
}));

jest.mock('../../../../../../selectors/identity', () => ({
  ...jest.requireActual('../../../../../../selectors/identity'),
  selectIsSignedIn: jest.fn(),
  selectCanonicalProfileId: jest.fn(),
}));

jest.mock('../../../../../../selectors/seedlessOnboardingController', () => ({
  ...jest.requireActual(
    '../../../../../../selectors/seedlessOnboardingController',
  ),
  selectSeedlessOnboardingUserId: jest.fn(),
}));

jest.mock('../../../../../../selectors/keyringController', () => ({
  ...jest.requireActual('../../../../../../selectors/keyringController'),
  selectIsUnlocked: jest.fn(),
}));

const mockSelectIsSignedIn = jest.mocked(selectIsSignedIn);
const mockSelectIsUnlocked = jest.mocked(selectIsUnlocked);
const mockSelectCanonicalProfileId = jest.mocked(selectCanonicalProfileId);
const mockSelectSeedlessOnboardingUserId = jest.mocked(
  selectSeedlessOnboardingUserId,
);
const mockIsUserEligibleForTrial = jest.mocked(
  Engine.context.SubscriptionController.isUserEligibleForTrial,
);

const createState = () =>
  ({
    engine: {
      backgroundState: {},
    },
  }) as unknown as RootState;

const renderEligibility = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={configureStore(createState())}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  return renderHook(() => useMoneyAccountPlusTrialEligibility(), {
    wrapper: Wrapper,
  });
};

describe('useMoneyAccountPlusTrialEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectIsSignedIn.mockReturnValue(true);
    mockSelectIsUnlocked.mockReturnValue(true);
    mockSelectCanonicalProfileId.mockReturnValue('profile-a');
    mockSelectSeedlessOnboardingUserId.mockReturnValue('social-user-a');
  });

  it('returns true when the controller reports a Money Account Plus trial', async () => {
    mockIsUserEligibleForTrial.mockResolvedValue(true);

    const { result } = renderEligibility();

    await waitFor(() => {
      expect(result.current.isEligibleForTrial).toBe(true);
    });
    expect(mockIsUserEligibleForTrial).toHaveBeenCalledWith(
      PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
    );
  });

  it('returns false when the controller reports the user is not eligible', async () => {
    mockIsUserEligibleForTrial.mockResolvedValue(false);

    const { result } = renderEligibility();

    await waitFor(() => {
      expect(mockIsUserEligibleForTrial).toHaveBeenCalledTimes(1);
    });
    expect(result.current.isEligibleForTrial).toBe(false);
  });

  it('returns false and skips the controller when the wallet is locked', () => {
    mockSelectIsUnlocked.mockReturnValue(false);

    const { result } = renderEligibility();

    expect(result.current.isEligibleForTrial).toBe(false);
    expect(mockIsUserEligibleForTrial).not.toHaveBeenCalled();
  });

  it('returns false after the wallet locks when the previous check was eligible', async () => {
    mockIsUserEligibleForTrial.mockResolvedValue(true);

    const { result, rerender } = renderEligibility();

    await waitFor(() => {
      expect(result.current.isEligibleForTrial).toBe(true);
    });

    mockSelectIsUnlocked.mockReturnValue(false);
    rerender(undefined);

    expect(result.current.isEligibleForTrial).toBe(false);
    expect(mockIsUserEligibleForTrial).toHaveBeenCalledTimes(1);
  });

  it('returns false when the signed-in profile changes until that profile is checked', async () => {
    mockIsUserEligibleForTrial.mockResolvedValue(true);

    const { result, rerender } = renderEligibility();

    await waitFor(() => {
      expect(result.current.isEligibleForTrial).toBe(true);
    });

    mockSelectCanonicalProfileId.mockReturnValue('profile-b');
    mockIsUserEligibleForTrial.mockResolvedValue(false);
    rerender(undefined);

    expect(result.current.isEligibleForTrial).toBe(false);

    await waitFor(() => {
      expect(mockIsUserEligibleForTrial).toHaveBeenCalledTimes(2);
    });
    expect(result.current.isEligibleForTrial).toBe(false);
  });

  it('returns false when the social login user changes until that user is checked', async () => {
    mockIsUserEligibleForTrial.mockResolvedValue(true);

    const { result, rerender } = renderEligibility();

    await waitFor(() => {
      expect(result.current.isEligibleForTrial).toBe(true);
    });

    mockSelectSeedlessOnboardingUserId.mockReturnValue('social-user-b');
    mockIsUserEligibleForTrial.mockResolvedValue(false);
    rerender(undefined);

    expect(result.current.isEligibleForTrial).toBe(false);

    await waitFor(() => {
      expect(mockIsUserEligibleForTrial).toHaveBeenCalledTimes(2);
    });
    expect(result.current.isEligibleForTrial).toBe(false);
  });

  it('returns false and skips the controller when the profile id is missing', () => {
    mockSelectCanonicalProfileId.mockReturnValue(undefined);

    const { result } = renderEligibility();

    expect(result.current.isEligibleForTrial).toBe(false);
    expect(mockIsUserEligibleForTrial).not.toHaveBeenCalled();
  });

  it('returns false when the controller rejects the eligibility check', async () => {
    mockIsUserEligibleForTrial.mockRejectedValue(new Error('messenger'));

    const { result } = renderEligibility();

    await waitFor(() => {
      expect(mockIsUserEligibleForTrial).toHaveBeenCalledTimes(1);
    });
    expect(result.current.isEligibleForTrial).toBe(false);
  });
});
