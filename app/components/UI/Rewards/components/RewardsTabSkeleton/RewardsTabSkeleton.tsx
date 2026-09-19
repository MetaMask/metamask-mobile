import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components-temp/Skeleton/Skeleton';

export const REWARDS_TAB_SKELETON_TEST_IDS = {
  CONTAINER: 'rewards-tab-skeleton',
  HEADER: 'rewards-tab-skeleton-header',
  BODY: 'rewards-tab-skeleton-body',
} as const;

interface RewardsTabSkeletonProps {
  testID?: string;
}

/**
 * The single loading surface for the Rewards tab.
 *
 * The tab resolves the Money referral persona before it may mount a home, and
 * the home it picks then waits on its own fetch. Both phases render this, so
 * the handoff reads as one screen instead of two skeletons swapping places.
 */
const RewardsTabSkeleton: React.FC<RewardsTabSkeletonProps> = ({
  testID = REWARDS_TAB_SKELETON_TEST_IDS.CONTAINER,
}) => {
  const tw = useTailwind();

  return (
    <SafeAreaView
      edges={{ top: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={testID}
    >
      <Box
        twClassName="flex-row items-center justify-between px-4 py-3"
        testID={REWARDS_TAB_SKELETON_TEST_IDS.HEADER}
      >
        <Skeleton style={tw.style('h-7 w-32 rounded-md')} />
        <Box twClassName="flex-row gap-2">
          <Skeleton style={tw.style('h-8 w-8 rounded-full')} />
          <Skeleton style={tw.style('h-8 w-8 rounded-full')} />
        </Box>
      </Box>

      <Box twClassName="px-4 gap-4" testID={REWARDS_TAB_SKELETON_TEST_IDS.BODY}>
        <Skeleton style={tw.style('h-10 w-full rounded-md')} />
        <Skeleton style={tw.style('h-44 w-full rounded-xl')} />
        <Skeleton style={tw.style('h-28 w-full rounded-xl')} />
      </Box>
    </SafeAreaView>
  );
};

export default RewardsTabSkeleton;
