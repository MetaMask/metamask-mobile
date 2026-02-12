import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import DropTile from '../components/DropTile/DropTile';
import DropPrerequisiteList from '../components/DropPrerequisite/DropPrerequisiteList';
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
import useTooltipModal from '../../../hooks/useTooltipModal';

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
  const { openTooltipModal } = useTooltipModal();
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

  const sectionVisibility = useMemo(() => ({
      showQualifyNow: Boolean(
        !eligibility?.eligible && eligibility?.canCommit && !hasCommitted,
      ),
      showCommitment: Boolean(
        eligibility?.eligible && eligibility?.canCommit && !hasCommitted,
      ),
      showLeaderboard: Boolean(
        hasCommitted ||
          (drop?.status !== DropStatus.UPCOMING &&
            drop?.status !== DropStatus.OPEN),
      ),
    }), [
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

  const handleInfoPress = useCallback(() => {
    openTooltipModal(
      strings('rewards.drop_detail.info_title'),
      strings('rewards.drop_detail.info_description'),
    );
  }, [openTooltipModal]);

  const headerRightStyle = useMemo(() => tw.style('mr-4'), [tw]);

  const HeaderRight = useCallback(
    () => (
      <View style={headerRightStyle}>
        <ButtonIcon
          iconName={IconName.Question}
          size={ButtonIconSize.Lg}
          iconProps={{ color: IconColor.IconDefault }}
          onPress={handleInfoPress}
          testID="drop-detail-info-button"
        />
      </View>
    ),
    [headerRightStyle, handleInfoPress],
  );

  // Set navigation title with back button and info icon
  useEffect(() => {
    navigation.setOptions({
      ...getNavigationOptionsTitle(
        strings('rewards.drop_detail.title'),
        navigation,
        false,
        colors,
      ),
      headerTitleAlign: 'center',
      headerRight: HeaderRight,
    });
  }, [colors, navigation, HeaderRight]);

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
        <DropTile drop={drop} />

        {/*  Qualify now section */}
        {sectionVisibility.showQualifyNow && drop.prerequisites && (
          <Box twClassName="gap-6">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.drop_detail.qualify_now')}
            </Text>
            <DropPrerequisiteList
              prerequisites={drop.prerequisites}
              prerequisiteStatuses={eligibility?.prerequisiteStatuses}
            />
            <DropCTAButtons prerequisites={drop.prerequisites} />
          </Box>
        )}

        {/*  Initial drop commitment section */}
        {sectionVisibility.showCommitment && (
          <Box twClassName="gap-4">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.drops.enter_the_drop')}
            </Text>
            <Box twClassName="gap-2">
              <Box flexDirection={BoxFlexDirection.Row} gap={3}>
                <Icon name={IconName.Explore} size={IconSize.Lg} />
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  twClassName="text-text-default flex-1"
                >
                  {strings('rewards.drops.spend_points_title')}
                </Text>
              </Box>
              <Box flexDirection={BoxFlexDirection.Row}>
                <Box twClassName="w-9" />
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  twClassName="text-alternative text-left flex-1"
                >
                  {strings('rewards.drops.spend_points_description')}
                </Text>
              </Box>
            </Box>
            <DropAccountSection
              eligibility={eligibility}
              onEnterPress={() =>
                navigation.navigate(Routes.REWARDS_DROP_COMMITMENT, {
                  dropId: drop.id,
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
