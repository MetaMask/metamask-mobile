import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './StakingEarnings.styles';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import useTooltipModal from '../../../../../components/hooks/useTooltipModal';
import { strings } from '../../../../../../locales/i18n';
import { isPooledStakingFeatureEnabled } from '../../../Stake/constants';
import useStakingChain from '../../hooks/useStakingChain';
import { StakeSDKProvider } from '../../sdk/stakeSdkProvider';
import useStakingEarnings from '../../hooks/useStakingEarnings';
import usePooledStakes from '../../hooks/usePooledStakes';

const StakingEarningsContent = () => {
  const { styles } = useStyles(styleSheet, {});

  const { openTooltipModal } = useTooltipModal();

  const { hasStakedPositions } = usePooledStakes();

  const {
    annualRewardRate,
    lifetimeRewardsETH,
    lifetimeRewardsFiat,
    estimatedAnnualEarningsETH,
    estimatedAnnualEarningsFiat,
    isLoadingEarningsData,
  } = useStakingEarnings();

  const onNavigateToTooltipModal = () =>
    openTooltipModal(
      strings('stake.annual_rate'),
      strings('tooltip_modal.reward_rate.tooltip'),
    );

  const { isStakingSupportedChain } = useStakingChain();

  if (
    !isPooledStakingFeatureEnabled() ||
    !isStakingSupportedChain ||
    !hasStakedPositions ||
    isLoadingEarningsData
  )
    return <></>;

  return (
    <View style={styles.stakingEarningsContainer}>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('stake.your_earnings')}
      </Text>
      <View>
        {/* Annual Rate */}
        <View style={styles.keyValueRow}>
          <View style={styles.keyValuePrimaryTextWrapper}>
            <Text
              variant={TextVariant.BodyMDMedium}
              style={styles.keyValuePrimaryText}
            >
              {strings('stake.annual_rate')}
            </Text>
            <ButtonIcon
              size={ButtonIconSizes.Sm}
              iconColor={IconColor.Muted}
              iconName={IconName.Info}
              accessibilityRole="button"
              accessibilityLabel={strings(
                'stake.accessibility_labels.stake_annual_rate_tooltip',
              )}
              onPress={onNavigateToTooltipModal}
            />
          </View>
          <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
            {annualRewardRate}
          </Text>
        </View>
        <View style={styles.keyValueRow}>
          <View style={styles.keyValuePrimaryTextWrapperCentered}>
            <Text
              variant={TextVariant.BodyMDMedium}
              style={styles.keyValuePrimaryText}
            >
              {strings('stake.lifetime_rewards')}
            </Text>
          </View>
          <View style={styles.keyValueSecondaryText}>
            <Text variant={TextVariant.BodyMD}>{lifetimeRewardsFiat}</Text>
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {lifetimeRewardsETH}
            </Text>
          </View>
        </View>
        <View style={styles.keyValueRow}>
          <View style={styles.keyValuePrimaryTextWrapperCentered}>
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Alternative}
            >
              {strings('stake.estimated_annual_earnings')}
            </Text>
          </View>
          <View style={styles.keyValueSecondaryText}>
            <Text variant={TextVariant.BodyMD}>
              {estimatedAnnualEarningsFiat}
            </Text>
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {estimatedAnnualEarningsETH}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export const StakingEarnings = () => (
  <StakeSDKProvider>
    <StakingEarningsContent />
  </StakeSDKProvider>
);

export default StakingEarnings;
