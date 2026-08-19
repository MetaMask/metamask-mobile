import { renderHook, act } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { usePredictNavigation } from './usePredictNavigation';
import Routes from '../../../../constants/navigation/Routes';
import {
  PredictBuyPreviewParams,
  PredictMarketDetailsParams,
} from '../types/navigation';
import { PredictMarket, PredictOutcome, PredictOutcomeToken } from '../types';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: mockDispatch,
  }),
}));

const createMockParams = (
  overrides?: Partial<PredictBuyPreviewParams>,
): PredictBuyPreviewParams => ({
  market: { id: 'market-1' } as PredictMarket,
  outcome: { id: 'outcome-1' } as PredictOutcome,
  outcomeToken: { id: 'token-1' } as PredictOutcomeToken,
  entryPoint: 'predict_feed',
  ...overrides,
});

const createMockMarketDetailsParams = (
  overrides?: Partial<PredictMarketDetailsParams>,
): PredictMarketDetailsParams => ({
  marketId: 'market-1',
  entryPoint: 'predict_feed',
  ...overrides,
});

describe('usePredictNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('navigateToBuyPreview', () => {
    it('navigates directly to BuyPreview by default', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams();

      act(() => {
        result.current.navigateToBuyPreview(params);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.BUY_PREVIEW,
        params,
      );
    });

    it('navigates through ROOT when throughRoot option is true', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams();

      act(() => {
        result.current.navigateToBuyPreview(params, { throughRoot: true });
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
        params,
      });
    });

    it('passes all params through ROOT navigation', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams({
        entryPoint: 'carousel',
      });

      act(() => {
        result.current.navigateToBuyPreview(params, { throughRoot: true });
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
        params: expect.objectContaining({
          entryPoint: 'carousel',
        }),
      });
    });

    it('replace takes precedence over throughRoot', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams();

      act(() => {
        result.current.navigateToBuyPreview(params, {
          replace: true,
          throughRoot: true,
        });
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.PREDICT.MODALS.BUY_PREVIEW, params),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not initialize active order on direct navigation', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams();

      act(() => {
        result.current.navigateToBuyPreview(params);
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not dispatch a replace action on throughRoot navigation', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams();

      act(() => {
        result.current.navigateToBuyPreview(params, { throughRoot: true });
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('dispatches replace navigation when replace is true', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams();

      act(() => {
        result.current.navigateToBuyPreview(params, { replace: true });
      });

      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigateToMarketDetails', () => {
    it('navigates directly to MarketDetails by default', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockMarketDetailsParams();

      act(() => {
        result.current.navigateToMarketDetails(params);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MARKET_DETAILS,
        params,
      );
    });

    it('navigates through ROOT when throughRoot option is true', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockMarketDetailsParams({
        series: {
          id: 'btc-series',
          slug: 'btc-up-or-down-5m',
          title: 'BTC Up or Down',
          recurrence: '5m',
        },
        marketId: undefined,
      });

      act(() => {
        result.current.navigateToMarketDetails(params, { throughRoot: true });
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params,
      });
    });

    it('dispatches replace navigation when replace is true', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockMarketDetailsParams();

      act(() => {
        result.current.navigateToMarketDetails(params, { replace: true });
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.PREDICT.MARKET_DETAILS, params),
      );
    });
  });
});
