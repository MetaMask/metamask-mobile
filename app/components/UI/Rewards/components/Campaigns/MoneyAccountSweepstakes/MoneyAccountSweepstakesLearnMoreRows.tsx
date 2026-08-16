import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';

interface MoneyAccountSweepstakesLearnMoreRowsProps {
  campaignId: string;
}

interface LearnMoreRowProps {
  title: string;
  description: string;
  iconName: IconName;
  onPress: () => void;
  hasTopBorder?: boolean;
}

const LearnMoreRow: React.FC<LearnMoreRowProps> = ({
  title,
  description,
  iconName,
  onPress,
  hasTopBorder = false,
}) => (
  <Pressable accessibilityRole="button" onPress={onPress}>
    <Box
      alignItems={BoxAlignItems.Start}
      flexDirection={BoxFlexDirection.Row}
      twClassName={`gap-3 py-4 ${hasTopBorder ? 'border-t border-border-muted' : ''}`}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        backgroundColor={BoxBackgroundColor.PrimaryMuted}
        twClassName="h-8 w-8 shrink-0 rounded-full"
      >
        <Icon
          name={iconName}
          size={IconSize.Sm}
          color={IconColor.IconDefault}
        />
      </Box>
      <Box twClassName="flex-1 gap-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {title}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {description}
        </Text>
      </Box>
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Md}
        color={IconColor.IconAlternative}
      />
    </Box>
  </Pressable>
);

const MoneyAccountSweepstakesLearnMoreRows: React.FC<
  MoneyAccountSweepstakesLearnMoreRowsProps
> = ({ campaignId }) => {
  const navigation = useNavigation<AppNavigationProp>();

  const openMechanics = useCallback(() => {
    navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, { campaignId });
  }, [campaignId, navigation]);

  const openMoneyAccount = useCallback(() => {
    navigation.navigate(Routes.MONEY.ROOT, {
      screen: Routes.MONEY.HOME,
    });
  }, [navigation]);

  return (
    <Box twClassName="px-4 pt-2">
      <LearnMoreRow
        title="How it works"
        description="Learn how to earn entries"
        iconName={IconName.Chart}
        onPress={openMechanics}
      />
      <LearnMoreRow
        title="MetaMask USD"
        description="Learn more about mUSD"
        iconName={IconName.Coin}
        onPress={openMoneyAccount}
        hasTopBorder
      />
    </Box>
  );
};

export default MoneyAccountSweepstakesLearnMoreRows;
