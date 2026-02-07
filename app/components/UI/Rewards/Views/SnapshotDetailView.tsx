import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import SnapshotTile from '../components/SnapshotTile';
import SnapshotPrerequisiteList from '../components/SnapshotPrerequisite/SnapshotPrerequisiteList';
import SnapshotPrerequisiteItem from '../components/SnapshotPrerequisite/SnapshotPrerequisiteItem';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useSnapshots } from '../hooks/useSnapshots';
import { useSnapshotEligibility } from '../hooks/useSnapshotEligibility';
import {
  SnapshotDto,
  SnapshotStatus,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import useRewardsToast from '../hooks/useRewardsToast';
import Routes from '../../../../constants/navigation/Routes';
import { useSnapshotLeaderboard } from '../hooks/useSnapshotLeaderboard';
import SnapshotCTAButtons from '../components/SnapshotCTAButtons/SnapshotCTAButtons';
import SnapshotAccountSection from '../components/SnapshotAccountSection/SnapshotAccountSection';
import SnapshotLeaderboard from '../components/SnapshotLeaderboard';

/**
 * SnapshotDetailView displays detailed information about a specific snapshot.
 * Shows the snapshot tile.
 */
const SnapshotDetailView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route =
    useRoute<RouteProp<{ params: { snapshotId: string } }, 'params'>>();
  const { snapshotId } = route?.params ?? { snapshotId: '' };
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const hasRedirected = useRef(false);

  // Get snapshots using the hook
  const { snapshots, isLoading, hasError, fetchSnapshots } = useSnapshots();
  const snapshot = useMemo(
    (): SnapshotDto | undefined => snapshots?.find((s) => s.id === snapshotId),
    [snapshots, snapshotId],
  );

  // Fetch eligibility data for prerequisite statuses
  const { eligibility, refetch: refetchEligibility } =
    useSnapshotEligibility(snapshotId);

  const {
    leaderboard,
    isLoading: isLoadingLeaderboard,
    error: leaderboardError,
  } = useSnapshotLeaderboard(snapshotId);

  const hasCommitted = useMemo(() => Boolean(leaderboard?.userPosition?.points), [leaderboard]);

  const sectionVisibility = useMemo(() => {
    const isOpenOrUpcoming = [
      SnapshotStatus.UPCOMING,
      SnapshotStatus.OPEN,
    ].includes(snapshot?.status as SnapshotStatus);

    return {
      showQualifyNow: Boolean(
        snapshot?.prerequisites && !eligibility?.eligible && isOpenOrUpcoming,
      ),
      showCommitment: Boolean(
        !eligibility?.eligible && !hasCommitted && eligibility?.canCommit,
      ),
      showLeaderboard: Boolean(
        (eligibility?.eligible && hasCommitted) || !isOpenOrUpcoming,
      ),
    };
  }, [
    snapshot?.prerequisites,
    snapshot?.status,
    eligibility?.eligible,
    eligibility?.canCommit,
    hasCommitted,
  ]);

  useEffect(() => {
    if (snapshot) {
      refetchEligibility();
    }
  }, [snapshot, refetchEligibility]);

  // Redirect to rewards dashboard if snapshot not found after loading
  useEffect(() => {
    if (
      !isLoading &&
      !hasError &&
      !hasRedirected.current &&
      (!snapshotId || !snapshot)
    ) {
      hasRedirected.current = true;
      showToast(
        RewardsToastOptions.error(
          strings('rewards.snapshot_detail.toast_not_found_title'),
          strings('rewards.snapshot_detail.toast_not_found_description'),
        ),
      );
      navigation.navigate(Routes.REWARDS_DASHBOARD);
    }
  }, [
    isLoading,
    hasError,
    snapshotId,
    snapshot,
    navigation,
    showToast,
    RewardsToastOptions,
  ]);

  // Set navigation title with back button
  useEffect(() => {
    navigation.setOptions({
      ...getNavigationOptionsTitle(
        strings('rewards.snapshot_detail.title'),
        navigation,
        false,
        colors,
      ),
      headerTitleAlign: 'center',
    });
  }, [colors, navigation]);

  const renderSkeletonLoading = () => (
    <Box twClassName="h-40 bg-background-muted rounded-lg animate-pulse" />
  );

  const renderContent = () => {
    if (isLoading) {
      return renderSkeletonLoading();
    }

    if (hasError) {
      return (
        <RewardsErrorBanner
          title={strings('rewards.snapshot_detail.error_title')}
          description={strings('rewards.snapshot_detail.error_description')}
          onConfirm={fetchSnapshots}
          confirmButtonLabel={strings('rewards.snapshot_detail.retry')}
          testID="snapshot-detail-error-banner"
        />
      );
    }

    if (!snapshot) {
      return (
        <Box twClassName="items-center justify-center py-12">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.snapshot_detail.not_found')}
          </Text>
        </Box>
      );
    }

    return (
      <Box twClassName="gap-6">
        <SnapshotTile snapshot={snapshot} disableNavigation />

        {/*  Qualify now section */}
        {sectionVisibility.showQualifyNow && snapshot.prerequisites && (
          <Box twClassName="gap-6">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.snapshot_detail.qualify_now')}
            </Text>
            <SnapshotPrerequisiteList
              prerequisites={snapshot.prerequisites}
              prerequisiteStatuses={eligibility?.prerequisites}
            />
            <SnapshotCTAButtons prerequisites={snapshot.prerequisites} />
          </Box>
        )}

        {/*  Initial snapshot commitment section */}
        {sectionVisibility.showCommitment && (
          <Box twClassName="gap-4">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.snapshots.enter_the_snapshot')}
            </Text>
            <SnapshotPrerequisiteItem
              prerequisite={{
                type: 'ACTIVITY_COUNT',
                activityTypes: [],
                iconName: 'Explore',
                title: strings('rewards.snapshots.spend_points_title'),
                description: strings(
                  'rewards.snapshots.spend_points_description',
                ),
                minCount: 0,
              }}
              hideStatus
            />
            <SnapshotAccountSection
              eligibility={eligibility}
              onEnterPress={() =>
                navigation.navigate(Routes.REWARDS_SNAPSHOT_COMMITMENT, {
                  snapshotName: snapshot.name,
                  hasExistingCommitment: false,
                })
              }
            />
          </Box>
        )}

        {/*  Leaderboard section */}
        {sectionVisibility.showLeaderboard && (
          <Box twClassName="gap-6">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.snapshot_detail.leaderboard')}
            </Text>
            <SnapshotLeaderboard
              leaderboard={leaderboard}
              isLoading={isLoadingLeaderboard}
              error={leaderboardError}
              canCommit={eligibility?.canCommit ?? false}
              snapshotStatus={snapshot?.status as SnapshotStatus}
            />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <ErrorBoundary navigation={navigation} view="SnapshotDetailView">
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 py-4')}
        showsVerticalScrollIndicator={false}
        testID="snapshot-detail-view"
      >
        {renderContent()}
      </ScrollView>
    </ErrorBoundary>
  );
};

export default SnapshotDetailView;
