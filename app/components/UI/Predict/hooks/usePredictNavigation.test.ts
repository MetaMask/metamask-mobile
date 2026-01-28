import { renderHook } from '@testing-library/react-hooks';
import Routes from '../../../../constants/navigation/Routes';
import { usePredictNavigation } from './usePredictNavigation';
import { PredictEventValues } from '../constants/eventNames';
import { useIsInPredictNavigator } from './useIsInPredictNavigator';
import { useNavigation } from '@react-navigation/native';

jest.mock('./useIsInPredictNavigator');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
};

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

const mockUseIsInPredictNavigator =
  useIsInPredictNavigator as jest.MockedFunction<
    typeof useIsInPredictNavigator
  >;

describe('usePredictNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as ReturnType<typeof useNavigation>,
    );
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
      const { result } = renderHook(() => usePredictNavigation());

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

  describe('navigation object', () => {
    beforeEach(() => {
      mockUseIsInPredictNavigator.mockReturnValue(true);
    });

    it('returns navigation object from useNavigation hook', () => {
      const { result } = renderHook(() => usePredictNavigation());

      expect(result.current.navigation).toBe(mockNavigation);
    });

    it('returns same navigation object across renders', () => {
      const { result, rerender } = renderHook(() => usePredictNavigation());

      const firstNavigation = result.current.navigation;
      rerender();
      const secondNavigation = result.current.navigation;

      expect(firstNavigation).toBe(secondNavigation);
    });
  });
});
