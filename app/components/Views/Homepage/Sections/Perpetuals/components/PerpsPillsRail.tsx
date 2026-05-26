import React from 'react';
import PillScrollList from '../../../../TrendingView/components/PillScrollList';
import PerpsPillItem from '../../../../TrendingView/feeds/perps/PerpsPillItem';
import CryptoMoversSkeleton from '../../../../TrendingView/feeds/tokens/CryptoMoversSkeleton';
import type { PerpsFeedItem } from '../../../../TrendingView/feeds/perps/usePerpsFeed';

export interface PerpsPillsRailProps {
  data: PerpsFeedItem[];
  isLoading: boolean;
  onPressMarket: (market: PerpsFeedItem['market']) => void;
}

const PerpsPillsRail = ({
  data,
  isLoading,
  onPressMarket,
}: PerpsPillsRailProps) => (
  <PillScrollList<PerpsFeedItem>
    data={data}
    isLoading={isLoading}
    wrapperTwClassName="bg-transparent"
    renderItem={(item) => (
      <PerpsPillItem item={item} onNavigateToMarketDetails={onPressMarket} />
    )}
    keyExtractor={(item) => item.market.symbol}
    Skeleton={CryptoMoversSkeleton}
    listTestId="homepage-perps-pills-list"
  />
);

export default PerpsPillsRail;
