import { ExploreFeed } from '../../../Views/TrendingView/TrendingView';
import { PerpsScreenStack } from '../../../UI/Perps';
import { PredictRoot } from '../../../UI/PredictNext';
import { BridgeScreenStack } from '../../../UI/Bridge/routes';
import EarnSectionListView from '../../../UI/Earn/Views/EarnSectionListView/EarnSectionListView';
import CardRoutes from '../../../UI/Card/routes';
import { MoneyTabScreenStack } from '../../../UI/Money/routes';
import NftFullView from '../../../Views/NftFullView';
import Routes from '../../../../constants/navigation/Routes';
import { FIXED_TABS } from './fixedTabs';
import { COLLECT_PILLS, MONEY_PILLS, TRADE_PILLS } from './hubs';

describe('fixed tab hubs', () => {
  it('keeps the footer at Home, Money, Trade, Collect, and Social', () => {
    expect(FIXED_TABS.map((tab) => tab.label)).toEqual([
      'Home',
      'Money',
      'Trade',
      'Collect',
      'Social',
    ]);
    expect(FIXED_TABS.map((tab) => tab.routeName)).toEqual([
      Routes.WALLET.HOME,
      Routes.FIXED_TAB_NAV.MONEY,
      Routes.FIXED_TAB_NAV.TRADE,
      Routes.FIXED_TAB_NAV.COLLECT,
      Routes.SOCIAL.TAB,
    ]);
  });

  it('opens Trade on the existing Explore feed', () => {
    expect(TRADE_PILLS.map((pill) => pill.label)).toEqual([
      'Trending',
      'Perps',
      'Predictions',
      'Swaps',
    ]);
    expect(TRADE_PILLS.map((pill) => pill.Screen)).toEqual([
      ExploreFeed,
      PerpsScreenStack,
      PredictRoot,
      BridgeScreenStack,
    ]);
  });

  it('keeps Money and Collect destinations in order', () => {
    expect(MONEY_PILLS.map((pill) => [pill.label, pill.Screen])).toEqual([
      ['Account', MoneyTabScreenStack],
      ['Card', CardRoutes],
      ['Earn', EarnSectionListView],
    ]);
    expect(COLLECT_PILLS.map((pill) => pill.label)).toEqual([
      'Popular',
      'Packs',
      'Collection',
      'Market',
    ]);
    expect(COLLECT_PILLS[2]?.Screen).toBe(NftFullView);
  });
});
