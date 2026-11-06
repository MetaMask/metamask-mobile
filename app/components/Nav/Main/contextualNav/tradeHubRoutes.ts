import { StackActions } from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import { enterTradingHub, type TradingHubTab } from './contextualSection';

export interface TradingHubAvailability {
  perps: boolean;
  predictions: boolean;
}

/**
 * Real feature roots when they are registered. Otherwise the placeholder hub,
 * which still draws the same footer.
 */
export const tradingHubRouteName = (
  hub: TradingHubTab,
  availability: TradingHubAvailability,
): string => {
  switch (hub) {
    case 'swap':
      return Routes.BRIDGE.ROOT;
    case 'perps':
      return availability.perps ? Routes.PERPS.ROOT : Routes.TRADE_HUB;
    case 'predictions':
      return availability.predictions ? Routes.PREDICT.ROOT : Routes.TRADE_HUB;
    default:
      return Routes.TRADE_HUB;
  }
};

/** From the Trade tab: push the hub on the root stack. */
export const pushTradingHub = (
  hub: TradingHubTab,
  availability: TradingHubAvailability,
): void => {
  enterTradingHub(hub);
  NavigationService.navigation.navigate(tradingHubRouteName(hub, availability));
};

/**
 * From inside a hub: replace the screen so Back returns to the Trade tab
 * instead of walking every hub.
 */
export const replaceTradingHub = (
  hub: TradingHubTab,
  availability: TradingHubAvailability,
): void => {
  const route = tradingHubRouteName(hub, availability);
  enterTradingHub(hub);
  if (route === Routes.TRADE_HUB) {
    NavigationService.navigation.navigate(Routes.TRADE_HUB);
    return;
  }
  NavigationService.navigation.dispatch(StackActions.replace(route));
};
