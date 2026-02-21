import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Text,
  TextVariant,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  BoxFlexDirection,
  ButtonIcon,
  IconName,
  IconColor,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';
import MetamaskRewardsPointsImage from '../../../../images/rewards/metamask-rewards-points.svg';
import { useSelector } from 'react-redux';
import {
  selectBalanceRefereePortion,
  selectReferralCode,
  selectReferralCount,
  selectReferralDetailsError,
  selectReferralDetailsLoading,
  selectSeasonStatusError,
  selectSeasonStartDate,
} from '../../../../reducers/rewards/selectors';
import { useReferralDetails } from '../hooks/useReferralDetails';
import RewardsErrorBanner from './RewardsErrorBanner';
import ReferralStatsSection from './ReferralDetails/ReferralStatsSection';
import Routes from '../../../../constants/navigation/Routes';

const ReferralBottomSheetModal = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();

  const referralCode = useSelector(selectReferralCode);
  const refereeCount = useSelector(selectReferralCount);
  const balanceRefereePortion = useSelector(selectBalanceRefereePortion);
  const seasonStatusError = useSelector(selectSeasonStatusError);
  const seasonStartDate = useSelector(selectSeasonStartDate);
  const referralDetailsLoading = useSelector(selectReferralDetailsLoading);
  const referralDetailsError = useSelector(selectReferralDetailsError);

  const { fetchReferralDetails } = useReferralDetails();

  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNavigateToSettings = useCallback(() => {
    navigation.navigate(Routes.REFERRAL_REWARDS_VIEW);
  }, [navigation]);

  return (
    <BottomSheet ref={sheetRef}>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="p-4"
      >
        {/* Close Button */}
        <Box twClassName="w-full flex-row justify-end">
          <ButtonIcon
            onPress={handleDismiss}
            iconName={IconName.Close}
            iconProps={{
              color: IconColor.IconDefault,
            }}
          />
        </Box>

        {/* Title */}
        <Box twClassName="w-full items-start mb-2">
          <Text variant={TextVariant.HeadingLg}>
            {strings('rewards.ways_to_earn.referrals.sheet.title')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="bg-muted px-2 mt-2 py-1 rounded-md gap-1"
            alignItems={BoxAlignItems.Center}
          >
            <MetamaskRewardsPointsImage
              width={16}
              height={16}
              name="MetamaskRewardsPoints"
            />
            <Text variant={TextVariant.BodySm}>
              {strings('rewards.ways_to_earn.referrals.sheet.points')}
            </Text>
          </Box>
        </Box>

        {/* Description */}
        <Box twClassName="w-full mt-4 mb-6">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.referral.info.description')}
          </Text>
        </Box>

        <Box twClassName="w-full">
          {seasonStatusError && !seasonStartDate ? (
            <RewardsErrorBanner
              title={strings(
                'rewards.season_status_error.error_fetching_title',
              )}
              description={strings(
                'rewards.season_status_error.error_fetching_description',
              )}
            />
          ) : !referralDetailsLoading &&
            referralDetailsError &&
            !referralCode ? (
            <RewardsErrorBanner
              title={strings(
                'rewards.referral_details_error.error_fetching_title',
              )}
              description={strings(
                'rewards.referral_details_error.error_fetching_description',
              )}
              onConfirm={fetchReferralDetails}
              confirmButtonLabel={strings(
                'rewards.referral_details_error.retry_button',
              )}
            />
          ) : (
            <ReferralStatsSection
              earnedPointsFromReferees={balanceRefereePortion}
              refereeCount={refereeCount}
              earnedPointsFromRefereesLoading={referralDetailsLoading}
              refereeCountLoading={referralDetailsLoading}
              refereeCountError={referralDetailsError}
            />
          )}
        </Box>

        <Box twClassName="w-full mt-6">
          <Button
            variant={ButtonVariant.Primary}
            onPress={handleNavigateToSettings}
            isFullWidth
          >
            {strings('rewards.ways_to_earn.referrals.sheet.cta_label')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default ReferralBottomSheetModal;
