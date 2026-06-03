import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useGetPredictThePitchEligibleMarkets } from './useGetPredictThePitchEligibleMarkets';
import {
  selectPredictThePitchEligibleMarkets,
  selectPredictThePitchEligibleMarketsLoading,
  selectPredictThePitchEligibleMarketsError,
} from '../../../../reducers/rewards/selectors';
import {
  setPredictThePitchEligibleMarkets,
  setPredictThePitchEligibleMarketsLoading,
  setPredictThePitchEligibleMarketsError,
} from '../../../../reducers/rewards';
import type { PredictThePitchEligibleMarketsDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectPredictThePitchEligibleMarkets: jest.fn(),
  selectPredictThePitchEligibleMarketsLoading: jest.fn(),
  selectPredictThePitchEligibleMarketsError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setPredictThePitchEligibleMarkets: jest.fn((payload) => ({
    type: 'rewards/setPredictThePitchEligibleMarkets',
    payload,
  })),
  setPredictThePitchEligibleMarketsLoading: jest.fn((payload) => ({
    type: 'rewards/setPredictThePitchEligibleMarketsLoading',
    payload,
  })),
  setPredictThePitchEligibleMarketsError: jest.fn((payload) => ({
    type: 'rewards/setPredictThePitchEligibleMarketsError',
    payload,
  })),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

const MOCK_MARKETS: PredictThePitchEligibleMarketsDto = {
  games: [],
  props: [],
};

function setupSelectors({
  eligibleMarkets = null,
  isLoading = false,
  hasError = false,
}: {
  eligibleMarkets?: PredictThePitchEligibleMarketsDto | null;
  isLoading?: boolean;
  hasError?: boolean;
}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPredictThePitchEligibleMarkets) {
      return eligibleMarkets;
    }
    if (selector === selectPredictThePitchEligibleMarketsLoading) {
      return isLoading;
    }
    if (selector === selectPredictThePitchEligibleMarketsError) {
      return hasError;
    }
    return undefined;
  });
}

describe('useGetPredictThePitchEligibleMarkets', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({});
  });

  it('fetches eligible markets and dispatches success actions', async () => {
    mockCall.mockResolvedValueOnce(MOCK_MARKETS as never);

    renderHook(() => useGetPredictThePitchEligibleMarkets());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchEligibleMarketsLoading(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchEligibleMarketsError(false),
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getPredictThePitchEligibleMarkets',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchEligibleMarkets(MOCK_MARKETS),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchEligibleMarketsLoading(false),
    );
  });

  it('dispatches error action on failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('network') as never);

    renderHook(() => useGetPredictThePitchEligibleMarkets());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchEligibleMarketsError(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchEligibleMarketsLoading(false),
    );
  });

  it('returns selector state and exposes refetch', async () => {
    setupSelectors({
      eligibleMarkets: MOCK_MARKETS,
      isLoading: true,
      hasError: true,
    });
    mockCall.mockResolvedValue(MOCK_MARKETS as never);

    const { result } = renderHook(() => useGetPredictThePitchEligibleMarkets());

    expect(result.current.eligibleMarkets).toEqual(MOCK_MARKETS);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(true);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
  });
});
