import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../../core/NavigationService';
import ReduxService from '../../../../../core/redux';
import {
  selectActiveVenue,
  type ActiveVenueResolution,
} from '../../implementation';
import type { PredictEntityId } from '../../types';
import { PredictNextRoutes } from '../routes';
import {
  createLegacyPredictEventRef,
  createNextPredictEventRef,
} from './eventRef';
import { openPredict } from './openPredict';

jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { navigate: jest.fn() } },
}));

jest.mock('../../../../../core/redux', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn(() => ({})) } },
}));

jest.mock('../../implementation', () => ({
  ...jest.requireActual('../../implementation'),
  selectActiveVenue: jest.fn(),
}));

const mockNavigate = jest.mocked(NavigationService.navigation.navigate);

const givenActiveVenue = (activeVenue: ActiveVenueResolution) =>
  jest.mocked(selectActiveVenue).mockReturnValue(activeVenue);

describe('openPredict', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the Active Venue from the store at call time', () => {
    const state = { engine: {} };
    jest.mocked(ReduxService.store.getState).mockReturnValue(state as never);
    givenActiveVenue({
      status: 'ready',
      venue: 'polymarket',
      source: 'legacyLane',
    });

    openPredict({ type: 'home' });

    expect(selectActiveVenue).toHaveBeenCalledWith(state);
  });

  it('navigates Home on the legacy lane with the legacy route', () => {
    givenActiveVenue({
      status: 'ready',
      venue: 'polymarket',
      source: 'legacyLane',
    });

    const opened = openPredict({ type: 'home', entryPoint: 'rewards' });

    expect(opened).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: { entryPoint: 'rewards' },
    });
  });

  it('opens a Polymarket Event the way usePredictNavigation does through the root', () => {
    givenActiveVenue({
      status: 'ready',
      venue: 'polymarket',
      source: 'rollout',
    });

    openPredict({
      type: 'event',
      eventRef: createLegacyPredictEventRef({
        marketId: 'market-1',
        providerId: 'polymarket',
      }),
      entryPoint: 'search',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: 'market-1',
        providerId: 'polymarket',
        entryPoint: 'search',
      },
    });
  });

  it('opens add funds in the Predict modals', () => {
    givenActiveVenue({
      status: 'ready',
      venue: 'polymarket',
      source: 'rollout',
    });

    openPredict({ type: 'addFunds', autoDeposit: true });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
      params: { autoDeposit: true },
    });
  });

  it('navigates to the PredictNext Event for the Active Venue', () => {
    givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });

    openPredict({
      type: 'event',
      eventRef: createNextPredictEventRef(
        'kalshi',
        'KXNFLGAME-1' as PredictEntityId,
      ),
      titleSnapshot: 'Bills at Jets',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: PredictNextRoutes.EVENT,
      params: {
        venueId: 'kalshi',
        eventId: 'KXNFLGAME-1',
        titleSnapshot: 'Bills at Jets',
      },
    });
  });

  it('navigates nowhere for an intent the Active Venue cannot open', () => {
    givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });

    const opened = openPredict({ type: 'addFunds' });

    expect(opened).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates nowhere for an Event while the Active Venue is resolving', () => {
    givenActiveVenue({ status: 'resolving' });

    const opened = openPredict({
      type: 'event',
      eventRef: createLegacyPredictEventRef({
        marketId: 'market-1',
        providerId: 'polymarket',
      }),
    });

    expect(opened).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
