import React, { useMemo } from 'react';
import { ActivityIndicator, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../../locales/i18n';
import { selectSnapshotsRewardsEnabledFlag } from '../../../../../../../selectors/featureFlagController/rewards';
import { useSnapshots } from '../../../../hooks/useSnapshots';
import {
  SnapshotTile,
  UpcomingSnapshotTileCondensed,
} from '../../../../components/SnapshotTile';
import { Skeleton } from '../../../../../../../component-library/components/Skeleton';
import RewardsErrorBanner from '../../../../components/RewardsErrorBanner';
import { REWARDS_VIEW_SELECTORS } from '../../../../Views/RewardsView.constants';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 32; // Full width minus padding

/**
 * SnapshotsSection displays active and upcoming snapshots in the Overview tab.
 * Shows all active snapshots first (as large tiles), then all upcoming snapshots
 * (as condensed tiles). Both groups are sorted by opensAt ascending (earliest first).
 */
const SnapshotsSection: React.FC = () => {
  const isSnapshotsEnabled = useSelector(selectSnapshotsRewardsEnabledFlag);
  const tw = useTailwind();
  const { categorizedSnapshots, isLoading, hasError, fetchSnapshots } =
    useSnapshots();

  const { active, upcoming } = categorizedSnapshots;

  // Sort active and upcoming by opensAt ascending (earliest first)
  const sortedSnapshots = useMemo(() => {
    const sortByOpensAt = (a: (typeof active)[0], b: (typeof active)[0]) =>
      new Date(a.opensAt).getTime() - new Date(b.opensAt).getTime();

    const sortedActive = [...active].sort(sortByOpensAt);
    const sortedUpcoming = [...upcoming].sort(sortByOpensAt);

    // Active snapshots first, then upcoming
    return [...sortedActive, ...sortedUpcoming];
  }, [active, upcoming]);

  const hasSnapshots = sortedSnapshots.length > 0;

  // Return null if snapshots feature is disabled
  if (!isSnapshotsEnabled) {
    return null;
  }

  // Don't render if no snapshots and not loading/error
  if (!isLoading && !hasError && !hasSnapshots) {
    return null;
  }

  const renderContent = () => {
    // Show loading state
    if (isLoading && !hasSnapshots) {
      return (
        <Skeleton
          style={tw.style('h-50 rounded-xl bg-muted')}
          width={CARD_WIDTH}
        />
      );
    }

    // Show error state
    if (hasError && !hasSnapshots) {
      return (
        <RewardsErrorBanner
          title={strings('rewards.snapshots_section.error_title')}
          description={strings('rewards.snapshots_section.error_description')}
          onConfirm={fetchSnapshots}
          confirmButtonLabel={strings('rewards.snapshots_section.retry_button')}
        />
      );
    }

    return (
      <Box twClassName="gap-4">
        {sortedSnapshots.map((snapshot) => {
          const isActive = active.some((s) => s.id === snapshot.id);
          return isActive ? (
            <SnapshotTile key={snapshot.id} snapshot={snapshot} />
          ) : (
            <UpcomingSnapshotTileCondensed
              key={snapshot.id}
              snapshot={snapshot}
            />
          );
        })}
      </Box>
    );
  };

  return (
    <Box
      twClassName="pt-2 pb-4 px-4 gap-4"
      testID={REWARDS_VIEW_SELECTORS.SNAPSHOTS_SECTION}
    >
      {/* Section Header */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Text variant={TextVariant.HeadingMd} twClassName="text-default">
            {strings('rewards.snapshots_section.title')}
          </Text>
          {isLoading && hasSnapshots && <ActivityIndicator size="small" />}
        </Box>
      </Box>

      {/* Content */}
      {renderContent()}
    </Box>
  );
};

export default SnapshotsSection;
