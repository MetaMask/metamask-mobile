import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
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
import { Skeleton } from '../../../../component-library/components/Skeleton';
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
import Routes from '../../../../constants/navigation/Routes';
import { useDropLeaderboard } from '../hooks/useDropLeaderboard';
import DropCTAButtons from '../components/DropCTAButtons/DropCTAButtons';
import DropAccountSection from '../components/DropAccountSection/DropAccountSection';
import DropLeaderboard from '../components/DropLeaderboard';
import useTooltipModal from '../../../hooks/useTooltipModal';
import { useDropAccountSelection } from '../hooks/useDropAccountSelection';
import { useUpdateDropReceivingAddress } from '../hooks/useUpdateDropReceivingAddress';
import useRewardsToast from '../hooks/useRewardsToast';
import { createAccountSelectorNavDetails } from '../../../Views/AccountSelector';

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
  const { openTooltipModal } = useTooltipModal();
  const { showToast, RewardsToastOptions } = useRewardsToast();

  // Track pending account change for the "Change" flow (ref to avoid re-renders)
  const pendingAccountChangeRef = useRef(false);
  // Store the address at the time the user opens the account selector
  const addressBeforeChangeRef = useRef<string | undefined>(undefined);

  // Get drops using the hook
  const { drops, isLoading, hasError, fetchDrops } = useSeasonDrops();
  const drop = useMemo(
    (): SeasonDropDto | undefined => drops?.find((s) => s.id === dropId),
    [drops, dropId],
  );

  // Fetch eligibility data for prerequisite statuses
  const {
    eligibility,
    isLoading: isLoadingEligibility,
    error: eligibilityError,
    refetch: refetchEligibility,
  } = useDropEligibility(dropId);

  const {
    leaderboard,
    isLoading: isLoadingLeaderboard,
    error: leaderboardError,
  } = useDropLeaderboard(dropId);

  // Account selection for change flow
  const { selectedBlockchainAddress, hasValidAccount } =
    useDropAccountSelection(drop?.receivingBlockchain);
  const { updateDropReceivingAddress, isUpdating } =
    useUpdateDropReceivingAddress();

  // Keep refs in sync for use inside the focus callback
  const selectedAddressRef = useRef(selectedBlockchainAddress);
  selectedAddressRef.current = selectedBlockchainAddress;
  const hasValidAccountRef = useRef(hasValidAccount);
  hasValidAccountRef.current = hasValidAccount;

  const doChangeAccountUpdate = useCallback(
    async (address: string) => {
      const success = await updateDropReceivingAddress(dropId, address);
      if (success) {
        showToast(
          RewardsToastOptions.success(
            strings('rewards.drops.update_account_success_title'),
            strings('rewards.drops.update_account_success_description'),
          ),
        );
      } else {
        showToast(
          RewardsToastOptions.error(
            strings('rewards.drops.update_account_error_title'),
            strings('rewards.drops.update_account_error_description'),
          ),
        );
      }
    },
    [dropId, updateDropReceivingAddress, showToast, RewardsToastOptions],
  );

  // When the screen regains focus after the account selector closes, trigger the update
  useFocusEffect(
    useCallback(() => {
      if (!pendingAccountChangeRef.current) return;

      pendingAccountChangeRef.current = false;
      const newAddress = selectedAddressRef.current;
      const addressBefore = addressBeforeChangeRef.current;
      addressBeforeChangeRef.current = undefined;

      if (
        newAddress &&
        hasValidAccountRef.current &&
        newAddress !== addressBefore
      ) {
        doChangeAccountUpdate(newAddress);
      }
    }, [doChangeAccountUpdate]),
  );

  const handleChangeAccount = useCallback(() => {
    addressBeforeChangeRef.current = selectedBlockchainAddress;
    pendingAccountChangeRef.current = true;
    navigation.navigate(
      ...createAccountSelectorNavDetails({
        disablePrivacyMode: true,
        disableAddAccountButton: true,
      }),
    );
  }, [navigation, selectedBlockchainAddress]);

  const hasCommitted = useMemo(
    () => Boolean(leaderboard?.userPosition?.points),
    [leaderboard],
  );

  const eligibilityUnavailable =
    isLoadingEligibility || (eligibilityError && !eligibility);

  const sectionVisibility = useMemo(
    () => ({
      showQualifyNow: Boolean(
        !eligibilityUnavailable &&
          !isLoadingLeaderboard &&
          drop?.prerequisites &&
          !eligibility?.eligible &&
          eligibility?.canCommit &&
          !hasCommitted,
      ),
      showCommitment: Boolean(
        !eligibilityUnavailable &&
          !isLoadingLeaderboard &&
          eligibility?.eligible &&
          eligibility?.canCommit &&
          !hasCommitted,
      ),
      showLeaderboard: Boolean(
        !eligibilityUnavailable &&
          (isLoadingLeaderboard ||
            hasCommitted ||
            (drop?.status !== DropStatus.UPCOMING &&
              drop?.status !== DropStatus.OPEN)),
      ),
    }),
    [
      eligibilityUnavailable,
      isLoadingLeaderboard,
      drop?.prerequisites,
      drop?.status,
      eligibility?.eligible,
      eligibility?.canCommit,
      hasCommitted,
    ],
  );

  useEffect(() => {
    if (drop) {
      refetchEligibility();
    }
  }, [drop, refetchEligibility]);

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
    <Skeleton height={160} style={tw.style('rounded-lg')} />
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
        <DropTile drop={drop} disabled />

        {eligibilityUnavailable && isLoadingEligibility && (
          <Box twClassName="gap-6">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.drop_detail.qualify_now')}
            </Text>
            <DropPrerequisiteList
              prerequisites={
                drop?.prerequisites ?? { logic: 'AND', conditions: [] }
              }
              isLoading
            />
          </Box>
        )}

        {eligibilityError &&
          !eligibilityUnavailable &&
          !isLoadingEligibility && (
            <RewardsErrorBanner
              title={strings('rewards.drop_detail.eligibility_error_title')}
              description={strings(
                'rewards.drop_detail.eligibility_error_description',
              )}
              onConfirm={refetchEligibility}
              confirmButtonLabel={strings('rewards.drop_detail.retry')}
              testID="drop-eligibility-error-banner"
            />
          )}

        {/*  Qualify now section */}
        {sectionVisibility.showQualifyNow && drop?.prerequisites && (
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

        {/*  Initial drop commitment section (info only - account selector pinned to bottom) */}
        {sectionVisibility.showCommitment && (
          <Box twClassName="gap-4">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.drops.enter_the_drop')}
            </Text>
            <Box twClassName="gap-2">
              <Box flexDirection={BoxFlexDirection.Row} gap={3}>
                <Icon name={IconName.MountainFlag} size={IconSize.Lg} />
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
              dropId={drop?.id}
              onAddMorePoints={() =>
                navigation.navigate(Routes.REWARDS_DROP_COMMITMENT, {
                  dropId: drop?.id,
                  dropName: drop?.name,
                  hasExistingCommitment: true,
                })
              }
              onChangeAccount={handleChangeAccount}
              isChangingAccount={isUpdating}
            />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <ErrorBoundary navigation={navigation} view="DropDetailView">
      <View style={tw.style('flex-1')}>
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('px-4 py-4')}
          showsVerticalScrollIndicator={false}
          testID="drop-detail-view"
        >
          {renderContent()}
        </ScrollView>
        {sectionVisibility.showCommitment && drop && (
          <View style={tw.style('px-4 pb-4 mb-4')}>
            <DropAccountSection
              eligibility={eligibility}
              receivingBlockchain={drop.receivingBlockchain}
              onEnterPress={(blockchainAddress) =>
                navigation.navigate(Routes.REWARDS_DROP_COMMITMENT, {
                  dropId: drop.id,
                  dropName: drop.name,
                  hasExistingCommitment: false,
                  selectedBlockchainAddress: blockchainAddress,
                })
              }
            />
          </View>
        )}
      </View>
    </ErrorBoundary>
  );
};

export default DropDetailView;
