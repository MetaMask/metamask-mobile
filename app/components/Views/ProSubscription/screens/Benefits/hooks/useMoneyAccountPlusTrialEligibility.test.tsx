import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';
import Engine from '../../../../../../core/Engine';
import type { RootState } from '../../../../../../reducers';
import { selectIsSignedIn } from '../../../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
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
}));

jest.mock('../../../../../../selectors/keyringController', () => ({
  ...jest.requireActual('../../../../../../selectors/keyringController'),
  selectIsUnlocked: jest.fn(),
}));

const mockSelectIsSignedIn = jest.mocked(selectIsSignedIn);
const mockSelectIsUnlocked = jest.mocked(selectIsUnlocked);
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

  it('returns false when the controller rejects the eligibility check', async () => {
    mockIsUserEligibleForTrial.mockRejectedValue(new Error('messenger'));

    const { result } = renderEligibility();

    await waitFor(() => {
      expect(mockIsUserEligibleForTrial).toHaveBeenCalledTimes(1);
    });
    expect(result.current.isEligibleForTrial).toBe(false);
  });
});
