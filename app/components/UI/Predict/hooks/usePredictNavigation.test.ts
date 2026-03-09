import { renderHook, act } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { usePredictNavigation } from './usePredictNavigation';
import Routes from '../../../../constants/navigation/Routes';
import { PredictBuyPreviewParams } from '../types/navigation';
import { PredictMarket, PredictOutcome, PredictOutcomeToken } from '../types';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockInitializeActiveOrder = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: mockDispatch,
  }),
}));

jest.mock('./usePredictInitActiveOrder', () => ({
  usePredictInitActiveOrder: () => ({
    initializeActiveOrder: mockInitializeActiveOrder,
    activeOrder: null,
    updateActiveOrder: jest.fn(),
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

    it('navigates directly when throughRoot option is false', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams();

      act(() => {
        result.current.navigateToBuyPreview(params, { throughRoot: false });
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.BUY_PREVIEW,
        params,
      );
    });

    it('navigates directly when no options provided', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams();

      act(() => {
        result.current.navigateToBuyPreview(params);
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.BUY_PREVIEW,
        params,
      );
    });

    it('passes all params to the navigation call', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams({
        amount: 10,
        transactionId: 'tx-123',
        isConfirmation: true,
        animationEnabled: false,
      });

      act(() => {
        result.current.navigateToBuyPreview(params);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.BUY_PREVIEW,
        expect.objectContaining({
          amount: 10,
          transactionId: 'tx-123',
          isConfirmation: true,
          animationEnabled: false,
        }),
      );
    });

    it('passes all params through ROOT navigation', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams({
        amount: 25,
        entryPoint: 'carousel',
      });

      act(() => {
        result.current.navigateToBuyPreview(params, { throughRoot: true });
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
        params: expect.objectContaining({
          amount: 25,
          entryPoint: 'carousel',
        }),
      });
    });

    it('dispatches StackActions.replace when replace option is true', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams({
        animationEnabled: false,
      });

      act(() => {
        result.current.navigateToBuyPreview(params, { replace: true });
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.PREDICT.MODALS.BUY_PREVIEW, params),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
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

    it('calls initializeActiveOrder on direct navigation', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams();

      act(() => {
        result.current.navigateToBuyPreview(params);
      });

      expect(mockInitializeActiveOrder).toHaveBeenCalledWith({
        market: params.market,
        outcomeToken: params.outcomeToken,
        entryPoint: params.entryPoint,
      });
    });

    it('calls initializeActiveOrder on throughRoot navigation', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams();

      act(() => {
        result.current.navigateToBuyPreview(params, { throughRoot: true });
      });

      expect(mockInitializeActiveOrder).toHaveBeenCalledWith({
        market: params.market,
        outcomeToken: params.outcomeToken,
        entryPoint: params.entryPoint,
      });
    });

    it('does not call initializeActiveOrder on replace navigation', () => {
      const { result } = renderHook(() => usePredictNavigation());
      const params = createMockParams();

      act(() => {
        result.current.navigateToBuyPreview(params, { replace: true });
      });

      expect(mockInitializeActiveOrder).not.toHaveBeenCalled();
    });
  });
});
