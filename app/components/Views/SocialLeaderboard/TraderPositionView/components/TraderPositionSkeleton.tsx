import React from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SkeletonShell } from '../../TraderProfileView/components/Skeletons';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';

/** Token symbol + market-cap row */
const TokenInfoSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <SkeletonShell>
      <View style={tw.style('flex-row items-center justify-between')}>
        <View style={tw.style('flex-row items-center gap-3')}>
          <View style={tw.style('w-10 h-10 rounded-full')} />
          <View style={tw.style('gap-1.5')}>
            <View style={tw.style('w-16 h-5 rounded')} />
            <View style={tw.style('w-24 h-3 rounded')} />
          </View>
        </View>
        <View style={tw.style('items-end gap-1.5')}>
          <View style={tw.style('w-20 h-5 rounded')} />
          <View style={tw.style('w-14 h-3 rounded')} />
        </View>
      </View>
    </SkeletonShell>
  );
};

/** Price chart placeholder */
const ChartSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <SkeletonShell>
      <View style={tw.style('w-full h-40 rounded-xl')} />
    </SkeletonShell>
  );
};

/** 1H / 1D / 1W / 1M / All time period bar */
const TimePeriodSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <SkeletonShell>
      <View style={tw.style('flex-row justify-around')}>
        {['w-6', 'w-6', 'w-6', 'w-6', 'w-6'].map((width, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <View key={i} style={tw.style(`${width} h-4 rounded`)} />
        ))}
      </View>
    </SkeletonShell>
  );
};

/** PnL / position-value card */
const PnLCardSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <SkeletonShell>
      <View style={tw.style('gap-3')}>
        <View style={tw.style('flex-row justify-between')}>
          <View style={tw.style('w-24 h-4 rounded')} />
          <View style={tw.style('w-16 h-4 rounded')} />
        </View>
        <View style={tw.style('flex-row justify-between')}>
          <View style={tw.style('w-20 h-4 rounded')} />
          <View style={tw.style('w-14 h-4 rounded')} />
        </View>
      </View>
    </SkeletonShell>
  );
};

/** Two trade-row placeholders */
const TradesSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <>
      {[0, 1].map((i) => (
        <SkeletonShell key={i}>
          <View style={tw.style('flex-row items-center gap-3')}>
            <View style={tw.style('w-8 h-8 rounded-full')} />
            <View style={tw.style('flex-1 gap-1.5')}>
              <View style={tw.style('w-28 h-4 rounded')} />
              <View style={tw.style('w-16 h-3 rounded')} />
            </View>
            <View style={tw.style('items-end gap-1.5')}>
              <View style={tw.style('w-16 h-4 rounded')} />
              <View style={tw.style('w-10 h-3 rounded')} />
            </View>
          </View>
        </SkeletonShell>
      ))}
    </>
  );
};

/**
 * Full-screen skeleton shown while TraderPositionView is performing its
 * initial data fetch (deeplink cold-start or first-mount before bootstrap
 * resolves).
 */
const TraderPositionSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <View
      style={tw.style('flex-1')}
      testID={TraderPositionViewSelectorsIDs.SKELETON}
    >
      <TokenInfoSkeleton />
      <ChartSkeleton />
      <TimePeriodSkeleton />
      <PnLCardSkeleton />
      <TradesSkeleton />
    </View>
  );
};

export default TraderPositionSkeleton;
