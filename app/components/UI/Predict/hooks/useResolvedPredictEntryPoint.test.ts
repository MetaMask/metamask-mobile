import { renderHook } from '@testing-library/react-hooks';
import { useResolvedPredictEntryPoint } from './useResolvedPredictEntryPoint';
import { PredictEventValues } from '../constants/eventNames';

const mockUsePredictEntryPoint = jest.fn();
jest.mock('../contexts', () => ({
  usePredictEntryPoint: () => mockUsePredictEntryPoint(),
}));

const mockIsFromTrending = jest.fn();
jest.mock('../../Trending/services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      get isFromTrending() {
        return mockIsFromTrending();
      },
    }),
  },
}));

describe('useResolvedPredictEntryPoint', () => {
  beforeEach(() => {
    mockUsePredictEntryPoint.mockReturnValue(undefined);
    mockIsFromTrending.mockReturnValue(false);
  });

  it('returns context entry point when set', () => {
    mockUsePredictEntryPoint.mockReturnValue(
      PredictEventValues.ENTRY_POINT.CAROUSEL,
    );
    mockIsFromTrending.mockReturnValue(true);

    const { result } = renderHook(() =>
      useResolvedPredictEntryPoint(PredictEventValues.ENTRY_POINT.EXPLORE),
    );

    expect(result.current).toBe(PredictEventValues.ENTRY_POINT.CAROUSEL);
  });

  it('returns prop entry point when no context', () => {
    mockIsFromTrending.mockReturnValue(true);

    const { result } = renderHook(() =>
      useResolvedPredictEntryPoint(PredictEventValues.ENTRY_POINT.EXPLORE),
    );

    expect(result.current).toBe(PredictEventValues.ENTRY_POINT.EXPLORE);
  });

  it('returns TRENDING when session is active and no prop or context', () => {
    mockIsFromTrending.mockReturnValue(true);

    const { result } = renderHook(() =>
      useResolvedPredictEntryPoint(undefined),
    );

    expect(result.current).toBe(PredictEventValues.ENTRY_POINT.TRENDING);
  });

  it('returns PREDICT_FEED as default', () => {
    mockIsFromTrending.mockReturnValue(false);

    const { result } = renderHook(() =>
      useResolvedPredictEntryPoint(undefined),
    );

    expect(result.current).toBe(PredictEventValues.ENTRY_POINT.PREDICT_FEED);
  });
});
