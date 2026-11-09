import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { RebateQuoteResponse } from '../../../../core/Engine/controllers/rewards-money-controller/types';
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

jest.mock('../selectors/selectedAccountAddress', () => ({
  selectPerpsSelectedAccountAddress: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockUseSessionProfileId = jest.mocked(useSessionProfileId);
const mockGetPerpsRebateQuote = jest.mocked(
  Engine.context.RewardsMoneyController.getPerpsRebateQuote,
);
const REBATE_QUOTE = {
  product: 'perps',
  eligible: true,
  rebateBips: 500,
  reason: null,
} satisfies RebateQuoteResponse;

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
const queryClients = new Set<QueryClient>();

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

const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });
  queryClients.add(queryClient);
  return queryClient;
};

const createWrapper = (queryClient = createQueryClient()) => {
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
    mockGetPerpsRebateQuote.mockResolvedValue(REBATE_QUOTE);
  });

  afterEach(() => {
    cleanup();
    queryClients.forEach((queryClient) => queryClient.clear());
    queryClients.clear();
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

  it('does not refetch when trade metadata changes', async () => {
    const Wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ notionalUsd }) =>
        usePerpsRebateQuote({
          coin: 'ETH',
          direction: 'long',
          notionalUsd,
        }),
      {
        initialProps: { notionalUsd: '100' },
        wrapper: Wrapper,
      },
    );

    await waitFor(() => expect(result.current.data).toEqual(REBATE_QUOTE));
    rerender({ notionalUsd: '200' });
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));

    expect(mockGetPerpsRebateQuote).toHaveBeenCalledTimes(1);
  });

  it('refetches after the selected account changes', async () => {
    const accountQuote = { ...REBATE_QUOTE, rebateBips: 700 };
    mockGetPerpsRebateQuote
      .mockResolvedValueOnce(REBATE_QUOTE)
      .mockResolvedValueOnce(accountQuote);
    const Wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ address }) => {
        selectorState.address = address;
        return usePerpsRebateQuote();
      },
      {
        initialProps: { address: '0xabc' },
        wrapper: Wrapper,
      },
    );

    await waitFor(() => expect(result.current.data).toEqual(REBATE_QUOTE));
    rerender({ address: '0xdef' });
    await waitFor(() => expect(result.current.data).toEqual(accountQuote));

    expect(mockGetPerpsRebateQuote).toHaveBeenCalledTimes(2);
  });

  it('retries one transient quote failure through the query', async () => {
    mockGetPerpsRebateQuote
      .mockRejectedValueOnce(
        new RewardsMoneyRebateQuoteError(503, 'UNAVAILABLE', 'Server busy', 0),
      )
      .mockResolvedValueOnce(REBATE_QUOTE);
    const Wrapper = createWrapper();

    const { result } = renderHook(() => usePerpsRebateQuote(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(REBATE_QUOTE));
    expect(mockGetPerpsRebateQuote).toHaveBeenCalledTimes(2);
  });

  it('returns a cached quote while remount revalidation is pending', async () => {
    const queryClient = createQueryClient();
    const Wrapper = createWrapper(queryClient);
    const firstRender = renderHook(() => usePerpsRebateQuote(), {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(firstRender.result.current.data).toEqual(REBATE_QUOTE),
    );
    firstRender.unmount();

    let resolveRevalidation: (quote: RebateQuoteResponse) => void = () =>
      undefined;
    const revalidationPromise = new Promise<RebateQuoteResponse>((resolve) => {
      resolveRevalidation = resolve;
    });
    mockGetPerpsRebateQuote.mockReturnValueOnce(revalidationPromise);

    const secondRender = renderHook(() => usePerpsRebateQuote(), {
      wrapper: Wrapper,
    });

    expect(secondRender.result.current.data).toEqual(REBATE_QUOTE);
    await waitFor(() =>
      expect(secondRender.result.current.isFetching).toBe(true),
    );
    expect(mockGetPerpsRebateQuote).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveRevalidation(REBATE_QUOTE);
      await revalidationPromise;
    });
  });

  it('does not expose an enabled cache entry when a gate is disabled', async () => {
    const queryClient = createQueryClient();
    const Wrapper = createWrapper(queryClient);
    const firstRender = renderHook(() => usePerpsRebateQuote(), {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(firstRender.result.current.data).toEqual(REBATE_QUOTE),
    );
    firstRender.unmount();
    selectorState.perpsRebatesEnabled = false;

    const disabledRender = renderHook(() => usePerpsRebateQuote(), {
      wrapper: Wrapper,
    });

    expect(disabledRender.result.current.data).toBeUndefined();
    expect(disabledRender.result.current.fetchStatus).toBe('idle');
    expect(mockGetPerpsRebateQuote).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'the Perps flag is disabled',
      () => {
        selectorState.perpsRebatesEnabled = false;
      },
    ],
    [
      'the Rewards Money flag is disabled',
      () => {
        selectorState.rewardsMoneyControllerEnabled = false;
      },
    ],
    [
      'basic functionality is disabled',
      () => {
        selectorState.basicFunctionalityEnabled = false;
      },
    ],
    [
      'the user is signed out',
      () => {
        selectorState.isSignedIn = false;
      },
    ],
    [
      'the wallet is locked',
      () => {
        selectorState.isUnlocked = false;
      },
    ],
    [
      'the profile is unavailable',
      () => {
        mockUseSessionProfileId.mockReturnValue({
          profileId: undefined,
          isLoading: false,
        });
      },
    ],
    [
      'the network is offline',
      () => {
        mockUseNetworkTier.mockReturnValue('NONE');
      },
    ],
  ])('does not request a quote when %s', (_description, disableGate) => {
    disableGate();
    const Wrapper = createWrapper();

    const { result } = renderHook(() => usePerpsRebateQuote(), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetPerpsRebateQuote).not.toHaveBeenCalled();
  });

  it('requests a quote while the network tier is unknown', async () => {
    mockUseNetworkTier.mockReturnValue(null);
    const Wrapper = createWrapper();

    const { result } = renderHook(() => usePerpsRebateQuote(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(REBATE_QUOTE));
    expect(mockGetPerpsRebateQuote).toHaveBeenCalledTimes(1);
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

  it('retries rate-limited responses', () => {
    const error = new RewardsMoneyRebateQuoteError(
      429,
      'RATE_LIMITED',
      'Rate limited',
    );

    expect(retryPerpsRebateQuote(0, error)).toBe(true);
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
  it('uses the server retry delay', () => {
    const error = new RewardsMoneyRebateQuoteError(
      429,
      'RATE_LIMITED',
      'Rate limited',
      12,
    );

    const delay = getPerpsRebateRetryDelay(0, error);

    expect(delay).toBe(12_000);
  });

  it('uses the fallback delay without a Retry-After value', () => {
    const error = new RewardsMoneyRebateQuoteError(
      503,
      'UNAVAILABLE',
      'Server busy',
    );

    expect(getPerpsRebateRetryDelay(0, error)).toBe(1_000);
  });
});
