import { renderHook } from '@testing-library/react-native';
import TrendingFeedSessionManager from '../../Trending/services/TrendingFeedSessionManager';
import { PredictEventValues } from '../constants/eventNames';
import { usePredictEntryPoint } from './usePredictEntryPoint';

jest.mock('../../Trending/services/TrendingFeedSessionManager');

const mockGetInstance = TrendingFeedSessionManager.getInstance as jest.Mock;

describe('usePredictEntryPoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns TRENDING entry point when user is in trending session', () => {
    mockGetInstance.mockReturnValue({
      isFromTrending: true,
    });

    const { result } = renderHook(() => usePredictEntryPoint());

    expect(result.current).toBe(PredictEventValues.ENTRY_POINT.TRENDING);
  });

  it('returns PREDICT_FEED entry point when user is not in trending session', () => {
    mockGetInstance.mockReturnValue({
      isFromTrending: false,
    });

    const { result } = renderHook(() => usePredictEntryPoint());

    expect(result.current).toBe(PredictEventValues.ENTRY_POINT.PREDICT_FEED);
  });

  it('returns custom default entry point when not from trending', () => {
    mockGetInstance.mockReturnValue({
      isFromTrending: false,
    });

    const { result } = renderHook(() =>
      usePredictEntryPoint(PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS),
    );

    expect(result.current).toBe(
      PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
    );
  });

  it('returns TRENDING entry point even when custom default is provided', () => {
    // if the user is actually in a trending session, we want to track that they came from trending - that's the real source, not the fallback
    mockGetInstance.mockReturnValue({
      isFromTrending: true,
    });

    const { result } = renderHook(() =>
      usePredictEntryPoint(PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS),
    );

    expect(result.current).toBe(PredictEventValues.ENTRY_POINT.TRENDING);
  });
});
