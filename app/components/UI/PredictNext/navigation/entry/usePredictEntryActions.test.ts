import { renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { usePredictNavigation } from '../../../Predict/hooks/usePredictNavigation';
import {
  usePredictImplementation,
  type PredictImplementationResolution,
} from '../../implementation';
import type { PredictEntityId, PredictVenueId } from '../../types';
import { PredictNextRoutes } from '../routes';
import {
  createLegacyPredictEventRef,
  createNextPredictEventRef,
} from './eventRef';
import { usePredictEntryActions } from './usePredictEntryActions';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../Predict/hooks/usePredictNavigation', () => ({
  usePredictNavigation: jest.fn(),
}));

jest.mock('../../implementation', () => ({
  ...jest.requireActual('../../implementation'),
  usePredictImplementation: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockNavigateToMarketDetails = jest.fn();

const givenImplementation = (implementation: PredictImplementationResolution) =>
  jest.mocked(usePredictImplementation).mockReturnValue(implementation);

const polymarketRef = createLegacyPredictEventRef({
  marketId: 'market-1',
  providerId: 'polymarket',
});
const kalshiRef = createNextPredictEventRef(
  'kalshi',
  'KXNFLGAME-1' as PredictEntityId,
);

describe('usePredictEntryActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useNavigation)
      .mockReturnValue({ navigate: mockNavigate } as never);
    jest.mocked(usePredictNavigation).mockReturnValue({
      navigateToBuyPreview: jest.fn(),
      navigateToMarketDetails: mockNavigateToMarketDetails,
    });
  });

  describe('on the legacy implementation', () => {
    beforeEach(() => {
      givenImplementation({ status: 'ready', implementation: 'legacy' });
    });

    it('navigates Home with the caller navigation and legacy route', () => {
      const { result } = renderHook(() => usePredictEntryActions());

      const opened = result.current.openPredict({
        type: 'home',
        entryPoint: 'main_trade_button',
      });

      expect(opened).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: { entryPoint: 'main_trade_button' },
      });
    });

    it('opens an Event through usePredictNavigation through the root', () => {
      const { result } = renderHook(() => usePredictEntryActions());

      result.current.openPredict({ type: 'event', eventRef: polymarketRef });

      expect(mockNavigateToMarketDetails).toHaveBeenCalledWith(
        { marketId: 'market-1', providerId: 'polymarket' },
        { throughRoot: true },
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('opens add funds in the Predict modals', () => {
      const { result } = renderHook(() => usePredictEntryActions());

      result.current.openPredict({ type: 'addFunds', autoDeposit: true });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
        params: { autoDeposit: true },
      });
    });

    it('reports a Kalshi Event as unavailable and navigates nowhere', () => {
      const { result } = renderHook(() => usePredictEntryActions());

      expect(
        result.current.canOpenPredict({ type: 'event', eventRef: kalshiRef }),
      ).toBe(false);
      expect(
        result.current.openPredict({ type: 'event', eventRef: kalshiRef }),
      ).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockNavigateToMarketDetails).not.toHaveBeenCalled();
    });
  });

  describe('on the next implementation', () => {
    beforeEach(() => {
      givenImplementation({
        status: 'ready',
        implementation: 'next',
        venueId: 'kalshi' as PredictVenueId,
      });
    });

    it('navigates to a PredictNext route with the Venue', () => {
      const { result } = renderHook(() => usePredictEntryActions());

      result.current.openPredict({ type: 'portfolio' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: PredictNextRoutes.PORTFOLIO,
        params: { venueId: 'kalshi' },
      });
    });

    it('hides add funds and navigates nowhere for it', () => {
      const { result } = renderHook(() => usePredictEntryActions());

      expect(result.current.canOpenPredict({ type: 'addFunds' })).toBe(false);
      expect(result.current.openPredict({ type: 'addFunds' })).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('offers Home', () => {
      const { result } = renderHook(() => usePredictEntryActions());

      expect(result.current.canOpenPredict({ type: 'home' })).toBe(true);
    });
  });

  it('follows an Active Venue change on the next render', () => {
    givenImplementation({ status: 'ready', implementation: 'legacy' });
    const { result, rerender } = renderHook(() => usePredictEntryActions());
    givenImplementation({
      status: 'ready',
      implementation: 'next',
      venueId: 'kalshi' as PredictVenueId,
    });

    rerender({});
    result.current.openPredict({ type: 'home' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: PredictNextRoutes.HOME,
    });
  });

  it('keeps its actions stable while the implementation does not change', () => {
    const implementation: PredictImplementationResolution = {
      status: 'ready',
      implementation: 'legacy',
    };
    givenImplementation(implementation);
    const { result, rerender } = renderHook(() => usePredictEntryActions());
    const first = result.current;

    rerender({});

    expect(result.current).toBe(first);
  });
});
