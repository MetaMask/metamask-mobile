import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  SectionDivider,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { formatUsd } from '../../../Rewards/components/KolDashboard/rewardsUiFixtures';
import {
  requestRewardsDashboardTab,
  useClaimableRewards,
} from '../../../Rewards/components/KolDashboard/rewardsClaimStore';
import { MoneyClaimableRewardsCardTestIds } from './MoneyClaimableRewardsCard.testIds';

interface MoneyClaimableRewardsCardProps {
  /**
   * Whether the claimable amount should be masked.
   */
  privacyMode?: boolean;
}

const MoneyClaimableRewardsCard = ({
  privacyMode = false,
}: MoneyClaimableRewardsCardProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const claimableRewards = useClaimableRewards();

  const handleClaimPress = useCallback(() => {
    // `earnings` is the Claims tab. Request it before navigating: the Rewards
    // screen unmounts while Money is selected, so a route param would be lost.
    requestRewardsDashboardTab('earnings');
    navigation.navigate(Routes.REWARDS_VIEW);
  }, [navigation]);

  // A claim on the Rewards Claims tab zeroes the store, which retires this card.
  if (claimableRewards <= 0) {
    return null;
  }

  return (
    <Box testID={MoneyClaimableRewardsCardTestIds.CONTAINER}>
      <Box twClassName="mx-4 mt-2">
        <Box twClassName="rounded-2xl bg-muted px-4 py-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Box twClassName="flex-1 pr-4">
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings('money.claimable_rewards.title')}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                >
                  {strings('money.claimable_rewards.currency_suffix')}
                </Text>
              </Box>
              <SensitiveText
                variant={TextVariant.HeadingSm}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
                isHidden={privacyMode}
                length={SensitiveTextLength.Short}
                testID={MoneyClaimableRewardsCardTestIds.AMOUNT}
              >
                {formatUsd(claimableRewards)}
              </SensitiveText>
            </Box>
            {/* Button applies `self-start` unless it is full width, which would
                override the row's centering, so it is wrapped to stay centered. */}
            <Box>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                onPress={handleClaimPress}
                testID={MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON}
              >
                {strings('rewards.kol.claim')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
      <SectionDivider
        marginVertical={8}
        testID={MoneyClaimableRewardsCardTestIds.DIVIDER}
      />
    </Box>
  );
};

export default MoneyClaimableRewardsCard;
