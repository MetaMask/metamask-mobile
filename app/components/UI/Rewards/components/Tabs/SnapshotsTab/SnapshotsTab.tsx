import React from 'react';
import { ActivityIndicator } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { useSnapshots } from '../../../hooks/useSnapshots';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import SnapshotsGroup from './SnapshotsGroup';

/**
 * SnapshotsTab displays all snapshots organized by status:
 * - Active (live)
 * - Upcoming
 * - Previous (calculating, distributing, complete)
 */
export const SnapshotsTab: React.FC = () => {
  const tw = useTailwind();
  const { categorizedSnapshots, isLoading, hasError, fetchSnapshots } =
    useSnapshots();

  const { active, upcoming, previous } = categorizedSnapshots;
  const hasSnapshots =
    active.length > 0 || upcoming.length > 0 || previous.length > 0;

  const renderContent = () => {
    // Show loading state
    if (isLoading && !hasSnapshots) {
      return (
        <Box twClassName="gap-6">
          <Box twClassName="gap-3">
            <Skeleton style={tw.style('h-6 w-20 rounded bg-muted')} />
            <Skeleton style={tw.style('h-50 rounded-xl bg-muted')} />
          </Box>
          <Box twClassName="gap-3">
            <Skeleton style={tw.style('h-6 w-24 rounded bg-muted')} />
            <Skeleton style={tw.style('h-50 rounded-xl bg-muted')} />
          </Box>
        </Box>
      );
    }

    // Show error state
    if (hasError && !hasSnapshots) {
      return (
        <RewardsErrorBanner
          title={strings('rewards.snapshots_tab.error_title')}
          description={strings('rewards.snapshots_tab.error_description')}
          onConfirm={fetchSnapshots}
          confirmButtonLabel={strings('rewards.snapshots_tab.retry_button')}
        />
      );
    }

    // Show empty state
    if (!hasSnapshots) {
      return (
        <Box twClassName="items-center justify-center py-12">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.snapshots_tab.empty_state')}
          </Text>
        </Box>
      );
    }

    return (
      <Box twClassName="gap-6">
        {/* Active Snapshots */}
        <SnapshotsGroup
          title={strings('rewards.snapshots_tab.active_title')}
          snapshots={active}
          testID={REWARDS_VIEW_SELECTORS.SNAPSHOTS_ACTIVE_SECTION}
        />

        {/* Upcoming Snapshots */}
        <SnapshotsGroup
          title={strings('rewards.snapshots_tab.upcoming_title')}
          snapshots={upcoming}
          testID={REWARDS_VIEW_SELECTORS.SNAPSHOTS_UPCOMING_SECTION}
        />

        {/* Previous Snapshots */}
        <SnapshotsGroup
          title={strings('rewards.snapshots_tab.previous_title')}
          snapshots={previous}
          testID={REWARDS_VIEW_SELECTORS.SNAPSHOTS_PREVIOUS_SECTION}
        />
      </Box>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={tw.style('flex-grow p-4')}
      showsVerticalScrollIndicator={false}
      testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT_SNAPSHOTS}
    >
      {/* Loading indicator when refreshing */}
      {isLoading && hasSnapshots && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-4 gap-2"
        >
          <ActivityIndicator size="small" />
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {strings('rewards.snapshots_tab.refreshing')}
          </Text>
        </Box>
      )}

      {renderContent()}
    </ScrollView>
  );
};
