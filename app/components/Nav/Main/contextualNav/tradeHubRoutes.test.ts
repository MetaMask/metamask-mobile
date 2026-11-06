import { StackActions } from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import {
  exitContextualSection,
  getContextualNavState,
} from './contextualSection';
import {
  pushTradingHub,
  replaceTradingHub,
  tradingHubRouteName,
} from './tradeHubRoutes';

jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { navigate: jest.fn(), dispatch: jest.fn() } },
}));

const enabled = { perps: true, predictions: true };
const disabled = { perps: false, predictions: false };

describe('tradingHubRouteName', () => {
  it('sends Swap to the bridge and the other hubs to their roots when registered', () => {
    expect(tradingHubRouteName('swap', enabled)).toBe(Routes.BRIDGE.ROOT);
    expect(tradingHubRouteName('perps', enabled)).toBe(Routes.PERPS.ROOT);
    expect(tradingHubRouteName('predictions', enabled)).toBe(
      Routes.PREDICT.ROOT,
    );
  });

  it('sends an unregistered hub to the placeholder', () => {
    expect(tradingHubRouteName('perps', disabled)).toBe(Routes.TRADE_HUB);
    expect(tradingHubRouteName('predictions', disabled)).toBe(Routes.TRADE_HUB);
    expect(tradingHubRouteName('swap', disabled)).toBe(Routes.BRIDGE.ROOT);
  });
});

describe('trading hub navigation', () => {
  const navigate = NavigationService.navigation.navigate as jest.Mock;
  const dispatch = NavigationService.navigation.dispatch as jest.Mock;

  beforeEach(() => {
    navigate.mockClear();
    dispatch.mockClear();
    exitContextualSection();
  });

  it('pushes the hub and records it before the route commits', () => {
    pushTradingHub('perps', enabled);

    expect(getContextualNavState()).toEqual({
      section: 'trading',
      tab: 'perps',
    });
    expect(navigate).toHaveBeenCalledWith(Routes.PERPS.ROOT);
  });

  it('replaces the current hub so Back does not walk every trade screen', () => {
    replaceTradingHub('swap', enabled);

    expect(getContextualNavState().tab).toBe('swap');
    expect(dispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.BRIDGE.ROOT),
    );
  });

  it('navigates to the placeholder when the feature root is not registered', () => {
    replaceTradingHub('predictions', disabled);

    expect(navigate).toHaveBeenCalledWith(Routes.TRADE_HUB);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
