import { Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import EarningsHistoryButton from '../../../Earn/components/Earnings/EarningsHistoryButton/EarningsHistoryButton';
import EarnMaintenanceBanner from '../../../Earn/components/EarnMaintenanceBanner';
import useEarnings from '../../../Earn/hooks/useEarnings';
import { selectPooledStakingServiceInterruptionBannerEnabledFlag } from '../../../Earn/selectors/featureFlags';
import { TokenI } from '../../../Tokens/types';
import { EVENT_LOCATIONS } from '../../constants/events';
import { useStakingChainByChainId } from '../../hooks/useStakingChain';
import { getTooltipMetricProperties } from '../../utils/metaMetrics/tooltipMetaMetricsUtils';
import { withMetaMetrics } from '../../utils/metaMetrics/withMetaMetrics';
import styleSheet from './StakingEarnings.styles';
import { trace, TraceName } from '../../../../../util/trace';
import { EARN_EXPERIENCES } from '../../../Earn/constants/experiences';
import {
  FontWeight as DesignSystemFontWeight,
  SensitiveText,
  SensitiveTextLength,
  TextColor as DesignSystemTextColor,
  TextVariant as DesignSystemTextVariant,
} from '@metamask/design-system-react-native';

export interface StakingEarningsProps {
  asset: TokenI;
}

export const STAKING_EARNINGS_TEST_IDS = {
  LIFETIME_EARNINGS_FIAT: 'staking-lifetime-earnings-fiat',
  LIFETIME_EARNINGS_TOKEN: 'staking-lifetime-earnings-token',
  ESTIMATED_ANNUAL_EARNINGS_FIAT: 'staking-estimated-annual-earnings-fiat',
  ESTIMATED_ANNUAL_EARNINGS_TOKEN: 'staking-estimated-annual-earnings-token',
};

const StakingEarningsContent = ({ asset }: StakingEarningsProps) => {
  const { styles } = useStyles(styleSheet, {});
  const privacyMode = useSelector(selectPrivacyMode);

  const isPooledStakingServiceInterruptionBannerEnabled = useSelector(
    selectPooledStakingServiceInterruptionBannerEnabledFlag,
  );

  const { navigate } = useNavigation<AppNavigationProp>();

  const {
    annualRewardRate,
    lifetimeRewards,
    lifetimeRewardsFiat,
    estimatedAnnualEarnings,
    estimatedAnnualEarningsFiat,
    isLoadingEarningsData,
    hasEarnPooledStakes,
  } = useEarnings({ asset });

  const { isStakingSupportedChain } = useStakingChainByChainId(
    asset.chainId as Hex,
  );

  const onDisplayAnnualRateTooltip = () => {
    trace({
      name: TraceName.EarnFaq,
      data: { experience: EARN_EXPERIENCES.POOLED_STAKING },
    });
    navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
      params: { chainId: asset.chainId },
    });
  };

  if (!isStakingSupportedChain || !hasEarnPooledStakes) return <></>;

  return (
    <View style={styles.stakingEarningsContainer}>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('stake.your_earnings')}
      </Text>
      <View style={styles.stakingEarningsContent}>
        {isPooledStakingServiceInterruptionBannerEnabled && (
          <EarnMaintenanceBanner />
        )}
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
              size={ButtonIconSizes.Xs}
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
              {annualRewardRate} APR
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
                <SensitiveText
                  variant={DesignSystemTextVariant.BodyMd}
                  isHidden={privacyMode}
                  length={SensitiveTextLength.Medium}
                  testID={STAKING_EARNINGS_TEST_IDS.LIFETIME_EARNINGS_FIAT}
                >
                  {lifetimeRewardsFiat}
                </SensitiveText>
                <SensitiveText
                  variant={DesignSystemTextVariant.BodySm}
                  fontWeight={DesignSystemFontWeight.Medium}
                  color={DesignSystemTextColor.TextAlternative}
                  isHidden={privacyMode}
                  length={SensitiveTextLength.Short}
                  testID={STAKING_EARNINGS_TEST_IDS.LIFETIME_EARNINGS_TOKEN}
                >
                  {lifetimeRewards}
                </SensitiveText>
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
                <SensitiveText
                  variant={DesignSystemTextVariant.BodyMd}
                  isHidden={privacyMode}
                  length={SensitiveTextLength.Medium}
                  testID={
                    STAKING_EARNINGS_TEST_IDS.ESTIMATED_ANNUAL_EARNINGS_FIAT
                  }
                >
                  {estimatedAnnualEarningsFiat}
                </SensitiveText>
                <SensitiveText
                  variant={DesignSystemTextVariant.BodySm}
                  fontWeight={DesignSystemFontWeight.Medium}
                  color={DesignSystemTextColor.TextAlternative}
                  isHidden={privacyMode}
                  length={SensitiveTextLength.Short}
                  testID={
                    STAKING_EARNINGS_TEST_IDS.ESTIMATED_ANNUAL_EARNINGS_TOKEN
                  }
                >
                  {estimatedAnnualEarnings}
                </SensitiveText>
              </>
            )}
          </View>
        </View>
        <View style={styles.earningsHistory}>
          <EarningsHistoryButton asset={asset} />
        </View>
      </View>
    </View>
  );
};

export const StakingEarnings = ({ asset }: StakingEarningsProps) => (
  <StakingEarningsContent asset={asset} />
);

export default StakingEarnings;
