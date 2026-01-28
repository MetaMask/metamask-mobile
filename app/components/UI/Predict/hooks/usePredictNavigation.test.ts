import { renderHook } from '@testing-library/react-hooks';
import Routes from '../../../../constants/navigation/Routes';
import { usePredictNavigation } from './usePredictNavigation';
import { PredictEventValues } from '../constants/eventNames';
import { useIsInPredictNavigator } from './useIsInPredictNavigator';

jest.mock('./useIsInPredictNavigator');

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const mockUseIsInPredictNavigator =
  useIsInPredictNavigator as jest.MockedFunction<
    typeof useIsInPredictNavigator
  >;

describe('usePredictNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('when outside predict navigator', () => {
    const entryPoint = PredictEventValues.ENTRY_POINT.CAROUSEL;

    beforeEach(() => {
      mockUseIsInPredictNavigator.mockReturnValue(false);
    });

    it('navigates to buy preview with predict root as parent', () => {
      const { result } = renderHook(() =>
        usePredictNavigation({
          navigation: mockNavigation,
          entryPoint,
        }),
      );

      result.current.navigate(Routes.PREDICT.MODALS.BUY_PREVIEW, {
        market: { id: 'market-123' },
        outcome: { id: 'outcome-123' },
        outcomeToken: { id: 'token-123' },
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
        params: {
          market: { id: 'market-123' },
          outcome: { id: 'outcome-123' },
          outcomeToken: { id: 'token-123' },
          entryPoint,
        },
      });
    });

    it('navigates to unavailable modal with predict root as parent', () => {
      const { result } = renderHook(() =>
        usePredictNavigation({
          navigation: mockNavigation,
          entryPoint,
        }),
      );

      result.current.navigate(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MODALS.ROOT,
        params: {
          screen: Routes.PREDICT.MODALS.UNAVAILABLE,
          entryPoint,
        },
      });
    });
  });

  describe('when inside predict navigator', () => {
    const entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED;

    beforeEach(() => {
      mockUseIsInPredictNavigator.mockReturnValue(true);
    });

    it('navigates directly to buy preview', () => {
      const { result } = renderHook(() =>
        usePredictNavigation({
          navigation: mockNavigation,
          entryPoint,
        }),
      );

      result.current.navigate(Routes.PREDICT.MODALS.BUY_PREVIEW, {
        market: { id: 'market-123' },
        outcome: { id: 'outcome-123' },
        outcomeToken: { id: 'token-123' },
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.BUY_PREVIEW,
        {
          market: { id: 'market-123' },
          outcome: { id: 'outcome-123' },
          outcomeToken: { id: 'token-123' },
          entryPoint,
        },
      );
    });

    it('navigates directly to unavailable modal', () => {
      const { result } = renderHook(() =>
        usePredictNavigation({
          navigation: mockNavigation,
          entryPoint,
        }),
      );

      result.current.navigate(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
        entryPoint,
      });
    });
  });

  describe('when entry point is undefined', () => {
    beforeEach(() => {
      mockUseIsInPredictNavigator.mockReturnValue(true);
    });

    it('navigates directly when entry point is undefined', () => {
      const { result } = renderHook(() =>
        usePredictNavigation({
          navigation: mockNavigation,
        }),
      );

      result.current.navigate(Routes.PREDICT.MODALS.BUY_PREVIEW, {
        market: { id: 'market-123' },
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.BUY_PREVIEW,
        {
          market: { id: 'market-123' },
          entryPoint: undefined,
        },
      );
    });
  });
});
