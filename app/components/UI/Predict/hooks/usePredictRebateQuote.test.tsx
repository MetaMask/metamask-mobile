import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { RebateQuoteResponse } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { useSessionProfileId } from '../../../../util/notifications/hooks/useSessionProfileId';
import { selectPredictRebatesEnabled } from '../../../../selectors/featureFlagController/predictRebates';
import { usePredictRebateQuote } from './usePredictRebateQuote';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    RewardsMoneyController: {
      getPredictRebateQuote: jest.fn(),
    },
  },
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

jest.mock('../../../../util/notifications/hooks/useSessionProfileId', () => ({
  useSessionProfileId: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockUseSessionProfileId = jest.mocked(useSessionProfileId);
const mockGetPredictRebateQuote = jest.mocked(
  Engine.context.RewardsMoneyController.getPredictRebateQuote,
);

const QUOTE = {
  product: 'predict',
  eligible: true,
  rebateBips: 1000,
  reason: null,
  eligibleFee: { shareOfBuilderFee: '0.75', capBps: 300 },
} satisfies RebateQuoteResponse;

describe('usePredictRebateQuote', () => {
  const selectorValue = { value: true };

  const render = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return {
      queryClient,
      ...renderHook(() => usePredictRebateQuote(), { wrapper }),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    selectorValue.value = true;
    mockUseSelector.mockImplementation(() => selectorValue.value);
    mockUseNetworkTier.mockReturnValue('HIGH');
    mockUseSessionProfileId.mockReturnValue({
      profileId: 'profile-1',
    } as ReturnType<typeof useSessionProfileId>);
    mockGetPredictRebateQuote.mockResolvedValue(QUOTE);
  });

  it('fetches the Predict quote for the session profile', async () => {
    const { result, queryClient } = render();

    await waitFor(() => expect(result.current.data).toEqual(QUOTE));
    expect(mockGetPredictRebateQuote).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData(['predict', 'rebateQuote', 'profile-1', true]),
    ).toEqual(QUOTE);
    queryClient.clear();
  });

  it('does not fetch while the Predict rebates flag is off', () => {
    mockUseSelector.mockImplementation(
      (selector) => selector !== selectPredictRebatesEnabled,
    );

    const { queryClient } = render();

    expect(mockGetPredictRebateQuote).not.toHaveBeenCalled();
    queryClient.clear();
  });

  it('does not fetch while Rewards Money is off', () => {
    selectorValue.value = false;

    const { queryClient } = render();

    expect(mockGetPredictRebateQuote).not.toHaveBeenCalled();
    queryClient.clear();
  });

  it('does not fetch offline', () => {
    mockUseNetworkTier.mockReturnValue('NONE');

    const { queryClient } = render();

    expect(mockGetPredictRebateQuote).not.toHaveBeenCalled();
    queryClient.clear();
  });
});
