import { renderHook } from '@testing-library/react-hooks';
import Routes from '../../../../constants/navigation/Routes';
import { usePredictNavigation } from './usePredictNavigation';
import { PredictEventValues } from '../constants/eventNames';
import { PredictMarket, PredictOutcome, PredictOutcomeToken } from '../types';

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const createMockMarket = (): PredictMarket =>
  ({
    id: 'market-123',
    title: 'Test Market',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

const createMockOutcome = (): PredictOutcome =>
  ({
    id: 'outcome-123',
    title: 'Yes',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

const createMockOutcomeToken = (): PredictOutcomeToken =>
  ({
    id: 'token-123',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

describe('usePredictNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('when outside predict navigator', () => {
    const entryPoint = PredictEventValues.ENTRY_POINT.CAROUSEL;

    it('indicates user is outside predict navigator', () => {
      const { result } = renderHook(() =>
        usePredictNavigation({
          navigation: mockNavigation,
          entryPoint,
        }),
      );

      expect(result.current.isOutsidePredictNavigator).toBe(true);
    });

    it('navigates to buy preview with predict root as parent', () => {
      const { result } = renderHook(() =>
        usePredictNavigation({
          navigation: mockNavigation,
          entryPoint,
        }),
      );

      const market = createMockMarket();
      const outcome = createMockOutcome();
      const outcomeToken = createMockOutcomeToken();

      result.current.navigateToBuyPreview({ market, outcome, outcomeToken });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
        params: {
          market,
          outcome,
          outcomeToken,
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

      result.current.navigateToUnavailableModal();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MODALS.ROOT,
        params: {
          screen: Routes.PREDICT.MODALS.UNAVAILABLE,
        },
      });
    });
  });

  describe('when inside predict navigator', () => {
    const entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED;

    it('indicates user is inside predict navigator', () => {
      const { result } = renderHook(() =>
        usePredictNavigation({
          navigation: mockNavigation,
          entryPoint,
        }),
      );

      expect(result.current.isOutsidePredictNavigator).toBe(false);
    });

    it('navigates directly to buy preview', () => {
      const { result } = renderHook(() =>
        usePredictNavigation({
          navigation: mockNavigation,
          entryPoint,
        }),
      );

      const market = createMockMarket();
      const outcome = createMockOutcome();
      const outcomeToken = createMockOutcomeToken();

      result.current.navigateToBuyPreview({ market, outcome, outcomeToken });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.BUY_PREVIEW,
        {
          market,
          outcome,
          outcomeToken,
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

      result.current.navigateToUnavailableModal();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
    });
  });

  describe('when entry point is undefined', () => {
    it('treats undefined as inside predict navigator', () => {
      const { result } = renderHook(() =>
        usePredictNavigation({
          navigation: mockNavigation,
        }),
      );

      expect(result.current.isOutsidePredictNavigator).toBe(false);
    });

    it('navigates directly when entry point is undefined', () => {
      const { result } = renderHook(() =>
        usePredictNavigation({
          navigation: mockNavigation,
        }),
      );

      const market = createMockMarket();
      const outcome = createMockOutcome();
      const outcomeToken = createMockOutcomeToken();

      result.current.navigateToBuyPreview({ market, outcome, outcomeToken });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.BUY_PREVIEW,
        {
          market,
          outcome,
          outcomeToken,
          entryPoint: undefined,
        },
      );
    });

    it('navigates directly to unavailable modal when entry point is undefined', () => {
      const { result } = renderHook(() =>
        usePredictNavigation({
          navigation: mockNavigation,
        }),
      );

      result.current.navigateToUnavailableModal();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
    });
  });
});
