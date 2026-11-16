import React from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { BridgeTabKey } from './BridgeView.constants';
import BridgeMarketView from './BridgeMarketView';
import BridgeLimitOrderView from './BridgeLimitOrderView';
import BridgeRecurringBuyView from './BridgeRecurringBuyView';
import BridgeTabPageSkeleton from './BridgeTabPageSkeleton';

interface BridgeTabPageProps {
  tab: BridgeTabKey;
  /** When `false`, a skeleton stands in for the tab's view. */
  isMounted: boolean;
  location: MetaMetricsSwapsEventSource;
}

const BridgeTabPageContent = ({
  tab,
  location,
}: Pick<BridgeTabPageProps, 'tab' | 'location'>) => {
  switch (tab) {
    case BridgeTabKey.Limit:
      return <BridgeLimitOrderView location={location} />;
    case BridgeTabKey.Recurring:
      return <BridgeRecurringBuyView location={location} />;
    default:
      return <BridgeMarketView location={location} />;
  }
};

/**
 * A single `PagerView` page of the Bridge screen. It must stay the direct
 * child of the pager, since the pager lays out each child as a native page.
 */
const BridgeTabPage = ({ tab, isMounted, location }: BridgeTabPageProps) => {
  const tw = useTailwind();
  return (
    // The background covers the native page cell (white on iOS) while a page
    // is empty or still mounting.
    <View style={tw.style('flex-1 bg-default')} collapsable={false}>
      {isMounted ? (
        <BridgeTabPageContent tab={tab} location={location} />
      ) : (
        <BridgeTabPageSkeleton tab={tab} />
      )}
    </View>
  );
};

export default React.memo(BridgeTabPage);
