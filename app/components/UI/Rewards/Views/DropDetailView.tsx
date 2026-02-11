import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import DropTile from '../components/DropTile';
import DropPrerequisiteList from '../components/DropPrerequisite/DropPrerequisiteList';
import DropPrerequisiteItem from '../components/DropPrerequisite/DropPrerequisiteItem';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useSeasonDrops } from '../hooks/useSeasonDrops';
import { useDropEligibility } from '../hooks/useDropEligibility';
import {
  SeasonDropDto,
  DropStatus,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import useRewardsToast from '../hooks/useRewardsToast';
import Routes from '../../../../constants/navigation/Routes';
import { useDropLeaderboard } from '../hooks/useDropLeaderboard';
import DropCTAButtons from '../components/DropCTAButtons/DropCTAButtons';
import DropAccountSection from '../components/DropAccountSection/DropAccountSection';
import DropLeaderboard from '../components/DropLeaderboard';

/**
 * DropDetailView displays detailed information about a specific drop.
 * Shows the drop tile.
 */
const DropDetailView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute<RouteProp<{ params: { dropId: string } }, 'params'>>();
  const { dropId } = route?.params ?? { dropId: '' };
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const hasRedirected = useRef(false);

  // Get drops using the hook
  const { drops, isLoading, hasError, fetchDrops } = useSeasonDrops();
  const drop = useMemo(
    (): SeasonDropDto | undefined => drops?.find((s) => s.id === dropId),
    [drops, dropId],
  );

  // Fetch eligibility data for prerequisite statuses
  const { eligibility, refetch: refetchEligibility } =
    useDropEligibility(dropId);

  const {
    leaderboard,
    isLoading: isLoadingLeaderboard,
    error: leaderboardError,
  } = useDropLeaderboard(dropId);

  const hasCommitted = useMemo(
    () => Boolean(leaderboard?.userPosition?.points),
    [leaderboard],
  );

  const sectionVisibility = useMemo(() => {
    const isOpenOrUpcoming = [DropStatus.UPCOMING, DropStatus.OPEN].includes(
      drop?.status as DropStatus,
    );

    return {
      showQualifyNow: Boolean(
        drop?.prerequisites && !eligibility?.eligible && isOpenOrUpcoming,
      ),
      showCommitment: Boolean(
        !eligibility?.eligible && !hasCommitted && eligibility?.canCommit,
      ),
      showLeaderboard: Boolean(
        (eligibility?.eligible && hasCommitted) || !isOpenOrUpcoming,
      ),
    };
  }, [
    drop?.prerequisites,
    drop?.status,
    eligibility?.eligible,
    eligibility?.canCommit,
    hasCommitted,
  ]);

  useEffect(() => {
    if (drop) {
      refetchEligibility();
    }
  }, [drop, refetchEligibility]);

  // Redirect to rewards dashboard if drop not found after loading
  useEffect(() => {
    if (
      !isLoading &&
      !hasError &&
      !hasRedirected.current &&
      (!dropId || !drop)
    ) {
      hasRedirected.current = true;
      showToast(
        RewardsToastOptions.error(
          strings('rewards.drop_detail.toast_not_found_title'),
          strings('rewards.drop_detail.toast_not_found_description'),
        ),
      );
      navigation.navigate(Routes.REWARDS_DASHBOARD);
    }
  }, [
    isLoading,
    hasError,
    dropId,
    drop,
    navigation,
    showToast,
    RewardsToastOptions,
  ]);

  // Set navigation title with back button
  useEffect(() => {
    navigation.setOptions({
      ...getNavigationOptionsTitle(
        strings('rewards.drop_detail.title'),
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
          title={strings('rewards.drop_detail.error_title')}
          description={strings('rewards.drop_detail.error_description')}
          onConfirm={fetchDrops}
          confirmButtonLabel={strings('rewards.drop_detail.retry')}
          testID="drop-detail-error-banner"
        />
      );
    }

    if (!drop) {
      return (
        <Box twClassName="items-center justify-center py-12">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.drop_detail.not_found')}
          </Text>
        </Box>
      );
    }

    return (
      <Box twClassName="gap-6">
        <DropTile drop={drop} disableNavigation />

        {/*  Qualify now section */}
        {sectionVisibility.showQualifyNow && drop.prerequisites && (
          <Box twClassName="gap-6">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.drop_detail.qualify_now')}
            </Text>
            <DropPrerequisiteList
              prerequisites={drop.prerequisites}
              prerequisiteStatuses={eligibility?.prerequisites}
            />
            <DropCTAButtons prerequisites={drop.prerequisites} />
          </Box>
        )}

        {/*  Initial drop commitment section */}
        {sectionVisibility.showCommitment && (
          <Box twClassName="gap-4">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.drops.enter_the_snapshot')}
            </Text>
            <DropPrerequisiteItem
              prerequisite={{
                type: 'ACTIVITY_COUNT',
                activityTypes: [],
                iconName: 'Explore',
                title: strings('rewards.drops.spend_points_title'),
                description: strings('rewards.drops.spend_points_description'),
                minCount: 0,
              }}
              hideStatus
            />
            <DropAccountSection
              eligibility={eligibility}
              onEnterPress={() =>
                navigation.navigate(Routes.REWARDS_DROP_COMMITMENT, {
                  dropName: drop.name,
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
              {strings('rewards.drop_detail.leaderboard')}
            </Text>
            <DropLeaderboard
              leaderboard={leaderboard}
              isLoading={isLoadingLeaderboard}
              error={leaderboardError}
              canCommit={eligibility?.canCommit ?? false}
              dropStatus={drop?.status as DropStatus}
            />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <ErrorBoundary navigation={navigation} view="DropDetailView">
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 py-4')}
        showsVerticalScrollIndicator={false}
        testID="drop-detail-view"
      >
        {renderContent()}
      </ScrollView>
    </ErrorBoundary>
  );
};

export default DropDetailView;
