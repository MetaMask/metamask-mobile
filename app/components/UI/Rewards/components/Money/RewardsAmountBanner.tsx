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
import { formatMusdBaseUnits } from '../../utils/formatUtils';

export interface RewardsAmountBannerProps {
  baseUnits: string;
  /** The banner sentence, with `placeholder` where the amount goes. */
  bannerText: string;
  /** The token in `bannerText` the formatted amount replaces. */
  placeholder: string;
  learnMoreText: string;
  /** Title and description of the info sheet the banner opens. */
  sheetTitle: string;
  sheetDescription: string;
  testIds: Record<'BANNER' | 'LEARN_MORE', string>;
}

/**
 * Neutral banner that states an amount of rewards and opens an info sheet
 * explaining why. The paused and held banners are thin wrappers that pass
 * their own copy and test IDs.
 */
const RewardsAmountBanner: React.FC<RewardsAmountBannerProps> = ({
  baseUnits,
  bannerText,
  placeholder,
  learnMoreText,
  sheetTitle,
  sheetDescription,
  testIds,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const amount =
    formatMusdBaseUnits(baseUnits, { maximumFractionDigits: 2 }) ?? '';
  const openSheet = useCallback(() => {
    navigation.navigate(Routes.MODAL.REWARDS_INFO_SHEET_MODAL, {
      title: sheetTitle,
      description: sheetDescription,
    });
  }, [navigation, sheetDescription, sheetTitle]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={openSheet}
      testID={testIds.BANNER}
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
            {bannerText.split(placeholder).join(amount)}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.PrimaryDefault}
            testID={testIds.LEARN_MORE}
          >
            {learnMoreText}
          </Text>
        </Box>
      </BannerAlert>
    </Pressable>
  );
};

export default RewardsAmountBanner;
