import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engine from '../../../../../core/Engine';
import { selectRewardsMoneyControllerEnabled } from '../../../../../selectors/featureFlagController/rewardsMoneyController';
import type { CardSummaryResponse } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { useCardCashbackClaim } from './useCardCashbackClaim';
import useImmersveCashbackWallet from './useImmersveCashbackWallet';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock('../../../../../core/Engine', () => ({
  context: { RewardsMoneyController: { getCardSummary: jest.fn() } },
}));

jest.mock(
  '../../../../../selectors/featureFlagController/rewardsMoneyController',
  () => ({ selectRewardsMoneyControllerEnabled: jest.fn(() => true) }),
);

jest.mock('../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: () => ({ address: '0xmoney' }),
}));

jest.mock('./useCardCashbackClaim', () => ({
  useCardCashbackClaim: jest.fn(),
}));

const mockClaim = jest.fn();
const getCardSummary = jest.mocked(
  Engine.context.RewardsMoneyController.getCardSummary,
);

const summary = (
  overrides: Partial<CardSummaryResponse> = {},
): CardSummaryResponse => ({
  lifetime_total: '380000',
  claimable: '380000',
  held: '0',
  blocked: '0',
  voided: '0',
  pending: '0',
  claimed: '0',
  minimum_musd_base_units: '10000',
  blocking_reason: null,
  pairing_pending: false,
  ...overrides,
});

function renderWallet() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useImmersveCashbackWallet(), { wrapper });
}

describe('useImmersveCashbackWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(selectRewardsMoneyControllerEnabled).mockReturnValue(true);
    jest.mocked(useCardCashbackClaim).mockReturnValue({
      claim: mockClaim,
      isClaiming: false,
      canClaim: true,
      mpcAccount: false,
    });
  });

  it('shows the claimable balance in mUSD', async () => {
    getCardSummary.mockResolvedValue(summary());

    const { result } = renderWallet();

    await waitFor(() => expect(result.current.wallet?.balance).toBe('0.38'));
  });

  it('lets a claimable balance above the minimum be claimed', async () => {
    getCardSummary.mockResolvedValue(summary());

    const { result } = renderWallet();

    await waitFor(() =>
      expect(result.current.wallet?.isWithdrawable).toBe(true),
    );
  });

  it('cannot claim while the mechanism is closed', async () => {
    getCardSummary.mockResolvedValue(
      summary({
        claimable: '0',
        blocked: '380000',
        blocking_reason: 'MECHANISM_NOT_CLAIMABLE',
      }),
    );

    const { result } = renderWallet();

    await waitFor(() =>
      expect(result.current.labels?.actionUnavailable).toBe(
        'Claiming not available yet',
      ),
    );
    expect(result.current.wallet?.isWithdrawable).toBe(false);
  });

  it('reports a summary that failed to load', async () => {
    getCardSummary.mockRejectedValue(new Error('503'));

    const { result } = renderWallet();

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('says mUSD back is unavailable without asking Rewards when it is off', () => {
    jest.mocked(selectRewardsMoneyControllerEnabled).mockReturnValue(false);

    const { result } = renderWallet();

    expect(result.current.notice?.description).toBe(
      "mUSD back isn't available yet.",
    );
    expect(getCardSummary).not.toHaveBeenCalled();
  });

  it('reports a refused claim with its reason', async () => {
    getCardSummary.mockResolvedValue(summary());
    mockClaim.mockResolvedValue({ status: 'failed', category: 'wait' });
    const { result } = renderWallet();
    await waitFor(() => expect(result.current.wallet).not.toBeNull());

    await act(async () => {
      result.current.withdraw('0.38');
    });

    await waitFor(() =>
      expect(result.current.labels?.failure).toBe(
        'Claiming is busy right now. Try again in a few minutes.',
      ),
    );
    expect(result.current.monitoringStatus).toBe('failed');
  });

  it('reports a submitted claim as a success', async () => {
    getCardSummary.mockResolvedValue(summary());
    mockClaim.mockResolvedValue({ status: 'submitted' });
    const { result } = renderWallet();
    await waitFor(() => expect(result.current.wallet).not.toBeNull());

    await act(async () => {
      result.current.withdraw('0.38');
    });

    await waitFor(() =>
      expect(result.current.monitoringStatus).toBe('success'),
    );
  });

  it('does not offer a paid claim again when the reload after it fails', async () => {
    getCardSummary.mockResolvedValue(summary());
    mockClaim.mockResolvedValue({ status: 'submitted_stale' });
    const { result } = renderWallet();
    await waitFor(() =>
      expect(result.current.wallet?.isWithdrawable).toBe(true),
    );

    await act(async () => {
      result.current.withdraw('0.38');
    });

    await waitFor(() =>
      expect(result.current.monitoringStatus).toBe('success'),
    );
    expect(Number(result.current.wallet?.balance)).toBe(0);
    expect(result.current.wallet?.isWithdrawable).toBe(false);
  });
});
