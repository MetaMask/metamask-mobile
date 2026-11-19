import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';
import Engine from '../../../../../../core/Engine';
import type { RootState } from '../../../../../../reducers';
import { selectCanonicalProfileId } from '../../../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import { selectSeedlessOnboardingUserId } from '../../../../../../selectors/seedlessOnboardingController';
import {
  SUBSCRIPTIONS_QUERY_KEY,
  SUBSCRIPTIONS_REFETCH_INTERVAL,
} from '../../../../../../components/hooks/useSubscriptions';
import configureStore from '../../../../../../util/test/configureStore';
import { useMoneyAccountPlusTrialEligibility } from './useMoneyAccountPlusTrialEligibility';

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    SubscriptionController: {
      getSubscriptions: jest.fn(),
      isUserEligibleForTrial: jest.fn(),
    },
  },
}));

jest.mock('../../../../../../selectors/identity', () => ({
  ...jest.requireActual('../../../../../../selectors/identity'),
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

const mockSelectIsUnlocked = jest.mocked(selectIsUnlocked);
const mockSelectCanonicalProfileId = jest.mocked(selectCanonicalProfileId);
const mockSelectSeedlessOnboardingUserId = jest.mocked(
  selectSeedlessOnboardingUserId,
);
const mockGetSubscriptions = jest.mocked(
  Engine.context.SubscriptionController.getSubscriptions,
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

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

const renderEligibility = (queryClient = createQueryClient()) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={configureStore(createState())}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  return {
    queryClient,
    ...renderHook(() => useMoneyAccountPlusTrialEligibility(), {
      wrapper: Wrapper,
    }),
  };
};

describe('useMoneyAccountPlusTrialEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectIsUnlocked.mockReturnValue(true);
    mockSelectCanonicalProfileId.mockReturnValue('profile-a');
    mockSelectSeedlessOnboardingUserId.mockReturnValue('social-user-a');
    mockGetSubscriptions.mockResolvedValue([]);
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
    expect(result.current.isLoading).toBe(false);
    expect(mockGetSubscriptions).not.toHaveBeenCalled();
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

  it('loads subscriptions before asking whether the user can start a trial', async () => {
    const callOrder: string[] = [];
    mockGetSubscriptions.mockImplementation(async () => {
      callOrder.push('subscriptions');
      return [];
    });
    mockIsUserEligibleForTrial.mockImplementation(async () => {
      callOrder.push('eligibility');
      return false;
    });

    const { result } = renderEligibility();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(callOrder).toEqual(['subscriptions', 'eligibility']);
    expect(result.current.isEligibleForTrial).toBe(false);
  });

  it('stays not eligible when loading subscriptions fails', async () => {
    mockGetSubscriptions.mockRejectedValue(new Error('subscriptions'));

    const { result } = renderEligibility();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEligibleForTrial).toBe(false);
    expect(mockIsUserEligibleForTrial).not.toHaveBeenCalled();
  });

  it('keeps the trial answer when the profile id arrives after the social login id', async () => {
    mockSelectCanonicalProfileId.mockReturnValue(undefined);
    mockIsUserEligibleForTrial.mockResolvedValue(true);

    const { result, rerender } = renderEligibility();

    await waitFor(() => {
      expect(result.current.isEligibleForTrial).toBe(true);
    });

    mockSelectCanonicalProfileId.mockReturnValue('profile-a');
    rerender(undefined);

    expect(mockIsUserEligibleForTrial).toHaveBeenCalledTimes(1);
    expect(result.current.isEligibleForTrial).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('rechecks eligibility when the profile id changes and there is no social login id', async () => {
    mockSelectSeedlessOnboardingUserId.mockReturnValue(undefined);
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

  it('asks the controller when only the social login user id is present', async () => {
    mockSelectCanonicalProfileId.mockReturnValue(undefined);
    mockIsUserEligibleForTrial.mockResolvedValue(true);

    const { result } = renderEligibility();

    await waitFor(() => {
      expect(result.current.isEligibleForTrial).toBe(true);
    });
    expect(mockIsUserEligibleForTrial).toHaveBeenCalledWith(
      PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
    );
  });

  it('asks the controller when only the canonical profile id is present', async () => {
    mockSelectSeedlessOnboardingUserId.mockReturnValue(undefined);
    mockIsUserEligibleForTrial.mockResolvedValue(false);

    const { result } = renderEligibility();

    await waitFor(() => {
      expect(mockIsUserEligibleForTrial).toHaveBeenCalledTimes(1);
    });
    expect(result.current.isEligibleForTrial).toBe(false);
  });

  it('returns false and skips the controller when both identities are missing', () => {
    mockSelectCanonicalProfileId.mockReturnValue(undefined);
    mockSelectSeedlessOnboardingUserId.mockReturnValue(undefined);

    const { result } = renderEligibility();

    expect(result.current.isEligibleForTrial).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(mockGetSubscriptions).not.toHaveBeenCalled();
    expect(mockIsUserEligibleForTrial).not.toHaveBeenCalled();
  });

  it('reuses a fresh subscriptions query instead of fetching again', async () => {
    const queryClient = createQueryClient();
    await queryClient.fetchQuery({
      queryKey: SUBSCRIPTIONS_QUERY_KEY,
      queryFn: () => mockGetSubscriptions(),
      staleTime: SUBSCRIPTIONS_REFETCH_INTERVAL,
    });
    mockGetSubscriptions.mockClear();
    mockIsUserEligibleForTrial.mockResolvedValue(false);

    const { result } = renderEligibility(queryClient);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetSubscriptions).not.toHaveBeenCalled();
    expect(mockIsUserEligibleForTrial).toHaveBeenCalledTimes(1);
    expect(result.current.isEligibleForTrial).toBe(false);
  });

  it('retries the eligibility check after a subscriptions blip', async () => {
    mockGetSubscriptions
      .mockRejectedValueOnce(new Error('blip'))
      .mockResolvedValueOnce([]);
    mockIsUserEligibleForTrial.mockResolvedValue(true);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: 1, retryDelay: 0, gcTime: 0 },
      },
    });

    const { result } = renderEligibility(queryClient);

    await waitFor(() => {
      expect(result.current.isEligibleForTrial).toBe(true);
    });
    expect(mockGetSubscriptions).toHaveBeenCalledTimes(2);
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
