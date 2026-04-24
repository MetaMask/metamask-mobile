import React from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SkeletonShell } from '../../TraderProfileView/components/Skeletons';
import { NotificationPreferencesViewSelectorsIDs } from '../NotificationPreferencesView.testIds';

const SKELETON_ROW_COUNT = 3;

/**
 * Placeholder row that mirrors the layout of `TraderNotificationRow`:
 * avatar circle on the left, name bar beside it, toggle pill on the right.
 */
const TraderNotificationRowSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <SkeletonShell>
      <View style={tw.style('flex-row items-center')}>
        <View style={tw.style('w-10 h-10 rounded-full mr-3')} />
        <View style={tw.style('flex-1')}>
          <View style={tw.style('w-32 h-4 rounded')} />
        </View>
        <View style={tw.style('w-12 h-7 rounded-xl ml-3')} />
      </View>
    </SkeletonShell>
  );
};

/**
 * Renders `SKELETON_ROW_COUNT` shimmer rows to fill the "Traders you follow"
 * section while followed-trader data is loading.
 */
export const TradersFollowedSkeleton: React.FC = () => (
  <>
    {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
      <TraderNotificationRowSkeleton key={i} />
    ))}
  </>
);

/**
 * Placeholder for the global toggle row: label bar on the left, toggle pill
 * on the right. Matches the layout of the real row so the transition from
 * skeleton → real content is visually stable.
 */
const GlobalTogglePlaceholder: React.FC = () => {
  const tw = useTailwind();
  return (
    <SkeletonShell>
      <View style={tw.style('flex-row items-center justify-between')}>
        <View style={tw.style('w-40 h-4 rounded')} />
        <View style={tw.style('w-12 h-7 rounded-xl')} />
      </View>
    </SkeletonShell>
  );
};

/**
 * Placeholder for a single threshold radio row: label bar on the left,
 * radio circle on the right.
 */
const ThresholdRowPlaceholder: React.FC = () => {
  const tw = useTailwind();
  return (
    <SkeletonShell>
      <View style={tw.style('flex-row items-center justify-between')}>
        <View style={tw.style('w-24 h-4 rounded')} />
        <View style={tw.style('w-5 h-5 rounded-full')} />
      </View>
    </SkeletonShell>
  );
};

const THRESHOLD_PLACEHOLDER_COUNT = 4;

/**
 * Shimmer placeholder shown while the initial notification-preferences GET
 * is in flight. Mirrors the layout of the global toggle row plus the four
 * threshold rows so the UI doesn't shift — and, critically, doesn't render
 * `DEFAULT_SOCIAL_AI` (enabled: false) as if it were real data, which would
 * make the toggle visibly flash OFF on every (re)entry to the screen.
 */
export const PreferencesSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <View testID={NotificationPreferencesViewSelectorsIDs.PREFERENCES_LOADING}>
      <GlobalTogglePlaceholder />
      <View style={tw.style('h-px bg-muted mx-4')} />
      {Array.from({ length: THRESHOLD_PLACEHOLDER_COUNT }, (_, i) => (
        <ThresholdRowPlaceholder key={i} />
      ))}
    </View>
  );
};
