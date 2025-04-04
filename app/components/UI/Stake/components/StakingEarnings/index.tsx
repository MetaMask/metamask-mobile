import React from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';
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
import { strings } from '../../../../../../locales/i18n';
import { useStakingChainByChainId } from '../../hooks/useStakingChain';
import { StakeSDKProvider } from '../../sdk/stakeSdkProvider';
import useStakingEarnings from '../../hooks/useStakingEarnings';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { withMetaMetrics } from '../../utils/metaMetrics/withMetaMetrics';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { getTooltipMetricProperties } from '../../utils/metaMetrics/tooltipMetaMetricsUtils';
import { TokenI } from '../../../Tokens/types';
import StakingEarningsHistoryButton from './StakingEarningsHistoryButton/StakingEarningsHistoryButton';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { EVENT_LOCATIONS } from '../../constants/events';

export interface StakingEarningsProps {
  asset: TokenI;
}

const StakingEarningsContent = ({ asset }: StakingEarningsProps) => {
  const { styles } = useStyles(styleSheet, {});

  const { navigate } = useNavigation();

  const {
    annualRewardRate,
    lifetimeRewardsETH,
    lifetimeRewardsFiat,
    estimatedAnnualEarningsETH,
    estimatedAnnualEarningsFiat,
    isLoadingEarningsData,
    hasStakedPositions,
  } = useStakingEarnings();

  const { isStakingSupportedChain } = useStakingChainByChainId(
    asset.chainId as Hex,
  );

  const onDisplayAnnualRateTooltip = () =>
    navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
    });

  if (!isStakingSupportedChain || !hasStakedPositions) return <></>;

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
              onPress={withMetaMetrics(onDisplayAnnualRateTooltip, {
                event: MetaMetricsEvents.TOOLTIP_OPENED,
                properties: getTooltipMetricProperties(
                  EVENT_LOCATIONS.STAKING_EARNINGS,
                  'Annual Rate',
                ),
              })}
            />
          </View>
          {isLoadingEarningsData ? (
            <SkeletonPlaceholder>
              <SkeletonPlaceholder.Item
                width={100}
                height={20}
                borderRadius={6}
              />
            </SkeletonPlaceholder>
          ) : (
            <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
              {annualRewardRate}
            </Text>
          )}
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
            {isLoadingEarningsData ? (
              <SkeletonPlaceholder>
                <SkeletonPlaceholder.Item
                  width={100}
                  height={20}
                  borderRadius={6}
                />
                <SkeletonPlaceholder.Item
                  width={100}
                  height={20}
                  borderRadius={6}
                  marginTop={5}
                />
              </SkeletonPlaceholder>
            ) : (
              <>
                <Text variant={TextVariant.BodyMD}>{lifetimeRewardsFiat}</Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Alternative}
                >
                  {lifetimeRewardsETH}
                </Text>
              </>
            )}
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
            {isLoadingEarningsData ? (
              <SkeletonPlaceholder>
                <SkeletonPlaceholder.Item
                  width={100}
                  height={20}
                  borderRadius={6}
                />
                <SkeletonPlaceholder.Item
                  width={100}
                  height={20}
                  borderRadius={6}
                  marginTop={5}
                />
              </SkeletonPlaceholder>
            ) : (
              <>
                <Text variant={TextVariant.BodyMD}>
                  {estimatedAnnualEarningsFiat}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Alternative}
                >
                  {estimatedAnnualEarningsETH}
                </Text>
              </>
            )}
          </View>
        </View>
        <StakingEarningsHistoryButton asset={asset} />
      </View>
    </View>
  );
};

export const StakingEarnings = ({ asset }: StakingEarningsProps) => (
  <StakeSDKProvider>
    <StakingEarningsContent asset={asset} />
  </StakeSDKProvider>
);

export default StakingEarnings;
