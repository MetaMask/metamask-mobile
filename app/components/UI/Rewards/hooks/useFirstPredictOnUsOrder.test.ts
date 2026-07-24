import { renderHook, act } from '@testing-library/react-hooks';
import { Recurrence, type PredictMarket } from '../../Predict/types';
import useRewardsToast from './useRewardsToast';
import { useFirstPredictOnUsOrder } from './useFirstPredictOnUsOrder';

const mockShowToast = jest.fn();
const mockSuccess = jest.fn((title: string, description?: string) => ({
  type: 'success',
  title,
  description,
}));

jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      success: mockSuccess,
    },
  })),
}));

describe('useFirstPredictOnUsOrder', () => {
  const market: PredictMarket = {
    id: 'market-1',
    providerId: 'polymarket',
    slug: 'market-1',
    title: 'France Stage of Elimination',
    description: 'France Stage of Elimination',
    image: 'https://example.com/market.png',
    status: 'open',
    recurrence: Recurrence.NONE,
    category: 'sports',
    tags: ['world-cup'],
    outcomes: [],
    liquidity: 100,
    volume: 100,
  };
  const outcome = {
    id: 'condition-1',
    marketId: 'market-1',
    providerId: 'polymarket',
    title: 'Yes',
    description: 'Yes',
    image: '',
    status: 'open' as const,
    tokens: [{ id: 'token-yes', title: 'Yes', price: 0.37 }],
    volume: 100,
    groupItemTitle: 'Yes',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a success toast for the fixed sponsored trade', async () => {
    const { result } = renderHook(() => useFirstPredictOnUsOrder());

    await act(async () => {
      await result.current.submitOrder({
        amountUsd: 5,
        market,
        outcome,
        outcomeToken: outcome.tokens[0],
        tradeDescriptionTemplate: 'Bought {amount} of {outcome}',
        tradePlacedLabel: 'Trade placed',
      });
    });

    expect(mockSuccess).toHaveBeenCalledWith(
      'Trade placed',
      'Bought $5.00 of Yes',
    );
    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'success',
      title: 'Trade placed',
      description: 'Bought $5.00 of Yes',
    });
    expect(useRewardsToast).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
