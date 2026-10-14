import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  RewardsMoneyAuthorizationError,
  RewardsMoneyRebateQuoteError,
} from '../../../../core/Engine/controllers/rewards-money-controller/services';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { selectPerpsRebatesEnabled } from '../../../../selectors/featureFlagController/perpsRebates';
import { selectRewardsMoneyControllerEnabled } from '../../../../selectors/featureFlagController/rewardsMoneyController';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { useSessionProfileId } from '../../../../util/notifications/hooks/useSessionProfileId';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import {
  buildPerpsRebateTrade,
  getPerpsRebateRetryDelay,
  retryPerpsRebateQuote,
  usePerpsRebateQuote,
} from './usePerpsRebateQuote';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    RewardsMoneyController: {
      getPerpsRebateQuote: jest.fn(),
    },
  },
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'MID'),
}));

jest.mock('../../../../util/notifications/hooks/useSessionProfileId', () => ({
  useSessionProfileId: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockUseSessionProfileId = jest.mocked(useSessionProfileId);
const mockGetPerpsRebateQuote = jest.mocked(
  Engine.context.RewardsMoneyController.getPerpsRebateQuote,
);

interface SelectorState {
  perpsRebatesEnabled: boolean;
  rewardsMoneyControllerEnabled: boolean;
  basicFunctionalityEnabled: boolean;
  isSignedIn: boolean;
  isUnlocked: boolean;
  address: string | undefined;
}

const selectorState: SelectorState = {
  perpsRebatesEnabled: true,
  rewardsMoneyControllerEnabled: true,
  basicFunctionalityEnabled: true,
  isSignedIn: true,
  isUnlocked: true,
  address: '0xabc',
};

const setSelectorMock = () => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPerpsRebatesEnabled) {
      return selectorState.perpsRebatesEnabled;
    }
    if (selector === selectRewardsMoneyControllerEnabled) {
      return selectorState.rewardsMoneyControllerEnabled;
    }
    if (selector === selectBasicFunctionalityEnabled) {
      return selectorState.basicFunctionalityEnabled;
    }
    if (selector === selectIsSignedIn) {
      return selectorState.isSignedIn;
    }
    if (selector === selectIsUnlocked) {
      return selectorState.isUnlocked;
    }
    if (selector === selectPerpsSelectedAccountAddress) {
      return selectorState.address;
    }
    return undefined;
  });
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
};

describe('usePerpsRebateQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(selectorState, {
      perpsRebatesEnabled: true,
      rewardsMoneyControllerEnabled: true,
      basicFunctionalityEnabled: true,
      isSignedIn: true,
      isUnlocked: true,
      address: '0xabc',
    });
    setSelectorMock();
    mockUseNetworkTier.mockReturnValue('WIFI');
    mockUseSessionProfileId.mockReturnValue({
      profileId: 'profile-1',
      isLoading: false,
    });
    mockGetPerpsRebateQuote.mockResolvedValue({
      product: 'perps',
      eligible: true,
      rebateBips: 500,
      reason: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requests a rebate quote with mapped trade metadata', async () => {
    const Wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        usePerpsRebateQuote({
          coin: 'BTC',
          direction: 'short',
          notionalUsd: '1250.50',
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetPerpsRebateQuote).toHaveBeenCalledWith({
      coin: 'BTC',
      side: 'SELL',
      notionalUsd: '1250.50',
    });
  });

  it('does not request a quote when the Perps flag is disabled', () => {
    selectorState.perpsRebatesEnabled = false;
    const Wrapper = createWrapper();

    const { result } = renderHook(() => usePerpsRebateQuote(), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetPerpsRebateQuote).not.toHaveBeenCalled();
  });

  it('does not request a quote on a known offline network', () => {
    mockUseNetworkTier.mockReturnValue('NONE');
    const Wrapper = createWrapper();

    const { result } = renderHook(() => usePerpsRebateQuote(), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetPerpsRebateQuote).not.toHaveBeenCalled();
  });

  it('does not request a quote while signed out', () => {
    selectorState.isSignedIn = false;
    const Wrapper = createWrapper();

    renderHook(() => usePerpsRebateQuote(), { wrapper: Wrapper });

    expect(mockGetPerpsRebateQuote).not.toHaveBeenCalled();
  });
});

describe('buildPerpsRebateTrade', () => {
  it('maps a long direction to a buy trade', () => {
    const trade = buildPerpsRebateTrade({
      coin: 'ETH',
      direction: 'long',
      notionalUsd: '10',
    });

    expect(trade).toEqual({
      coin: 'ETH',
      side: 'BUY',
      notionalUsd: '10',
    });
  });

  it('returns no trade when metadata is incomplete', () => {
    const trade = buildPerpsRebateTrade({
      coin: 'ETH',
      direction: undefined,
      notionalUsd: '10',
    });

    expect(trade).toBeUndefined();
  });
});

describe('retryPerpsRebateQuote', () => {
  it('retries the first unavailable response', () => {
    const error = new RewardsMoneyRebateQuoteError(
      503,
      'UNAVAILABLE',
      'Server busy',
      2,
    );

    const retry = retryPerpsRebateQuote(0, error);

    expect(retry).toBe(true);
  });

  it('does not retry authorization failures', () => {
    const error = new RewardsMoneyAuthorizationError('Unauthorized');

    const retry = retryPerpsRebateQuote(0, error);

    expect(retry).toBe(false);
  });

  it('does not retry invalid request failures', () => {
    const error = new RewardsMoneyRebateQuoteError(
      400,
      'INVALID_REQUEST',
      'Bad trade',
    );

    const retry = retryPerpsRebateQuote(0, error);

    expect(retry).toBe(false);
  });

  it('does not retry terminal not-found responses', () => {
    const error = new RewardsMoneyRebateQuoteError(404, 'FAILED', 'Not found');

    const retry = retryPerpsRebateQuote(0, error);

    expect(retry).toBe(false);
  });

  it('stops after one retry', () => {
    const retry = retryPerpsRebateQuote(1, new Error('Network failure'));

    expect(retry).toBe(false);
  });
});

describe('getPerpsRebateRetryDelay', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds jitter to the server retry delay', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const error = new RewardsMoneyRebateQuoteError(
      429,
      'RATE_LIMITED',
      'Rate limited',
      12,
    );

    const delay = getPerpsRebateRetryDelay(0, error);

    expect(delay).toBe(12_125);
  });
});
