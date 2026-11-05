import React from 'react';
import { ExploreFeed } from '../../../Views/TrendingView/TrendingView';
import { PerpsScreenStack } from '../../../UI/Perps';
import { PredictRoot } from '../../../UI/PredictNext';
import { BridgeScreenStack } from '../../../UI/Bridge/routes';
import EarnSectionListView from '../../../UI/Earn/Views/EarnSectionListView/EarnSectionListView';
import { MoneyTabScreenStack } from '../../../UI/Money/routes';
import CardRoutes from '../../../UI/Card/routes';
import NftFullView from '../../../Views/NftFullView';
import FixedTabPlaceholder from './FixedTabPlaceholder';
import PillHub from './PillHub';
import type { FixedTabPill, FixedTabScreen } from './fixedTabNav.types';

const placeholder = (title: string): FixedTabScreen => {
  const Screen = () => <FixedTabPlaceholder title={title} />;
  return Screen;
};

// Gacha Popular / Packs / Market are not in this checkout.
const PopularPlaceholder = placeholder('Popular');
const PacksPlaceholder = placeholder('Packs');
const MarketPlaceholder = placeholder('Market');

/**
 * Trade opens on Trending. That pill is the existing Explore feed.
 * There is no separate Trade landing screen.
 */
export const TRADE_PILLS: readonly FixedTabPill[] = [
  { key: 'trending', label: 'Trending', Screen: ExploreFeed },
  { key: 'perps', label: 'Perps', Screen: PerpsScreenStack },
  { key: 'predictions', label: 'Predictions', Screen: PredictRoot },
  { key: 'swaps', label: 'Swaps', Screen: BridgeScreenStack },
];

export const MONEY_PILLS: readonly FixedTabPill[] = [
  { key: 'earn', label: 'Earn', Screen: EarnSectionListView },
  { key: 'account', label: 'Account', Screen: MoneyTabScreenStack },
  { key: 'card', label: 'Card', Screen: CardRoutes },
];

export const COLLECT_PILLS: readonly FixedTabPill[] = [
  { key: 'popular', label: 'Popular', Screen: PopularPlaceholder },
  { key: 'packs', label: 'Packs', Screen: PacksPlaceholder },
  // Owned collectibles grid. The screen's back control is its own chrome.
  { key: 'collection', label: 'Collection', Screen: NftFullView },
  { key: 'market', label: 'Market', Screen: MarketPlaceholder },
];

export const TradeHub = () => (
  <PillHub testID="fixed-tab-trade" pills={TRADE_PILLS} />
);

export const MoneyHub = () => (
  <PillHub testID="fixed-tab-money" pills={MONEY_PILLS} />
);

export const CollectHub = () => (
  <PillHub testID="fixed-tab-collect" pills={COLLECT_PILLS} />
);
