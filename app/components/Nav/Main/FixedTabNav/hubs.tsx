import React from 'react';
import { ExploreFeed } from '../../../Views/TrendingView/TrendingView';
import { PerpsScreenStack } from '../../../UI/Perps';
import { PredictRoot } from '../../../UI/PredictNext';
import { BridgeScreenStack } from '../../../UI/Bridge/routes';
import EarnSectionListView from '../../../UI/Earn/Views/EarnSectionListView/EarnSectionListView';
import CardRoutes from '../../../UI/Card/routes';
import { MoneyTabScreenStack } from '../../../UI/Money/routes';
import NftFullView from '../../../Views/NftFullView';
import FixedTabPlaceholder from './FixedTabPlaceholder';
import TabHub from './TabHub';
import type { FixedHubTab, FixedTabScreen } from './fixedTabNav.types';

const placeholder = (title: string): FixedTabScreen => {
  const Screen = () => <FixedTabPlaceholder title={title} />;
  return Screen;
};

// Gacha Popular / Packs / Market are not in this checkout.
const PopularPlaceholder = placeholder('Popular');
const PacksPlaceholder = placeholder('Packs');
const MarketPlaceholder = placeholder('Market');

/**
 * Trade opens on Trending. That tab is the existing Explore feed.
 * There is no separate Trade landing screen.
 */
export const TRADE_TABS: readonly FixedHubTab[] = [
  { key: 'trending', label: 'Trending', Screen: ExploreFeed },
  { key: 'perps', label: 'Perps', Screen: PerpsScreenStack },
  { key: 'predictions', label: 'Predictions', Screen: PredictRoot },
  { key: 'swaps', label: 'Swaps', Screen: BridgeScreenStack },
];

/** Account is the Money screen and the screen Money opens on. */
export const MONEY_TABS: readonly FixedHubTab[] = [
  { key: 'account', label: 'Account', Screen: MoneyTabScreenStack },
  { key: 'card', label: 'Card', Screen: CardRoutes },
  { key: 'earn', label: 'Earn', Screen: EarnSectionListView },
];

export const COLLECT_TABS: readonly FixedHubTab[] = [
  { key: 'popular', label: 'Popular', Screen: PopularPlaceholder },
  { key: 'packs', label: 'Packs', Screen: PacksPlaceholder },
  // Owned collectibles grid. The screen's back control is its own chrome.
  { key: 'collection', label: 'Collection', Screen: NftFullView },
  { key: 'market', label: 'Market', Screen: MarketPlaceholder },
];

export const TradeHub = () => (
  <TabHub testID="fixed-tab-trade" tabs={TRADE_TABS} />
);

export const MoneyHub = () => (
  <TabHub testID="fixed-tab-money" tabs={MONEY_TABS} />
);

export const CollectHub = () => (
  <TabHub testID="fixed-tab-collect" tabs={COLLECT_TABS} />
);
