import React from 'react';
import { PillScrollList } from '../../../../../UI/Trending/components/PillScrollList';
import { PerpsPillItem } from '../../../../../UI/Perps/components/PerpsPillItem';
import { SectionPillsSkeleton } from '../../../../../UI/Trending/components/SectionPillsSkeleton';
import type { PerpsFeedItem } from '../../../../../UI/Perps/types/perpsFeedTypes';

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
    wrapperTwClassName="bg-transparent py-3"
    renderItem={(item) => (
      <PerpsPillItem item={item} onNavigateToMarketDetails={onPressMarket} />
    )}
    keyExtractor={(item) => item.market.symbol}
    Skeleton={SectionPillsSkeleton}
    listTestId="homepage-perps-pills-list"
  />
);

export default PerpsPillsRail;
