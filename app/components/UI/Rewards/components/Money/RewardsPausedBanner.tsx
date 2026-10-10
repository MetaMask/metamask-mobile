import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { formatMusdBaseUnits } from '../../utils/formatUtils';

export const REWARDS_PAUSED_BANNER_TEST_IDS = {
  BANNER: 'rewards-paused-banner',
  LEARN_MORE: 'rewards-paused-banner-learn-more',
} as const;

/**
 * Neutral banner for the under-review total on the claims history. The whole
 * banner opens the rewards paused sheet.
 */
const RewardsPausedBanner: React.FC<{
  baseUnits: string;
  localizedText: ReferralLocalizedText;
}> = ({ baseUnits, localizedText }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const amount =
    formatMusdBaseUnits(baseUnits, { maximumFractionDigits: 2 }) ?? '';
  const openRewardsPaused = useCallback(() => {
    navigation.navigate(Routes.MODAL.REWARDS_INFO_SHEET_MODAL, {
      title: localizedText.rewardsPausedTitle,
      description: localizedText.rewardsPausedDescription,
    });
  }, [localizedText, navigation]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={openRewardsPaused}
      testID={REWARDS_PAUSED_BANNER_TEST_IDS.BANNER}
    >
      <BannerAlert
        severity={BannerAlertSeverity.Neutral}
        twClassName="gap-2 items-center"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="flex-1 gap-2"
        >
          <Text variant={TextVariant.BodySm} twClassName="flex-1">
            {localizedText.rewardsPausedBanner.split('{amount}').join(amount)}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.PrimaryDefault}
            testID={REWARDS_PAUSED_BANNER_TEST_IDS.LEARN_MORE}
          >
            {localizedText.rewardsPausedLearnMore}
          </Text>
        </Box>
      </BannerAlert>
    </Pressable>
  );
};

export default RewardsPausedBanner;
