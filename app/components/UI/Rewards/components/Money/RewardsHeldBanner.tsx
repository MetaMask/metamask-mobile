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
import { REWARDS_HELD_BANNER_TEST_IDS } from './RewardsHeldBanner.testIds';

/**
 * Neutral banner for income held until a tax determination clears the payee.
 * The amount is `held` on families whose reason is
 * `TAX_DETERMINATION_REQUIRED`. The whole banner opens the rewards held
 * sheet, which explains the hold. It does not start the tax flow.
 */
const RewardsHeldBanner: React.FC<{
  baseUnits: string;
  localizedText: ReferralLocalizedText;
}> = ({ baseUnits, localizedText }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const heldAmount =
    formatMusdBaseUnits(baseUnits, { maximumFractionDigits: 2 }) ?? '';
  const openRewardsHeld = useCallback(() => {
    navigation.navigate(Routes.MODAL.REWARDS_INFO_SHEET_MODAL, {
      title: localizedText.rewardsHeldTitle,
      description: localizedText.rewardsHeldDescription,
    });
  }, [localizedText, navigation]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={openRewardsHeld}
      testID={REWARDS_HELD_BANNER_TEST_IDS.BANNER}
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
            {localizedText.rewardsHeldBanner
              .split('{heldAmount}')
              .join(heldAmount)}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.PrimaryDefault}
            testID={REWARDS_HELD_BANNER_TEST_IDS.LEARN_MORE}
          >
            {localizedText.rewardsHeldLearnMore}
          </Text>
        </Box>
      </BannerAlert>
    </Pressable>
  );
};

export default RewardsHeldBanner;
