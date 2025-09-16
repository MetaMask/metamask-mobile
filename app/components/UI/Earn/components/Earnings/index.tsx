import { useNavigation } from '@react-navigation/native';
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
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import EarnMaintenanceBanner from '../../../Earn/components/EarnMaintenanceBanner';
import { EVENT_LOCATIONS } from '../../../Earn/constants/events';
import useEarnings from '../../../Earn/hooks/useEarnings';
import {
  selectPooledStakingServiceInterruptionBannerEnabledFlag,
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { getTooltipMetricProperties } from '../../../Stake/utils/metaMetrics/tooltipMetaMetricsUtils';
import { withMetaMetrics } from '../../../Stake/utils/metaMetrics/withMetaMetrics';
import { TokenI } from '../../../Tokens/types';
import styleSheet from './Earnings.styles';
import EarningsHistoryButton from './EarningsHistoryButton/EarningsHistoryButton';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { RootState } from '../../../BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import { earnSelectors } from '../../../../../selectors/earnController';

export interface EarningsProps {
  asset: TokenI;
}

const EarningsContent = ({ asset }: EarningsProps) => {
  const { styles } = useStyles(styleSheet, {});

  const isEarnLendingServiceInterruptionBannerEnabled = useSelector(
    selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
  );

  const isPooledStakingServiceInterruptionBannerEnabled = useSelector(
    selectPooledStakingServiceInterruptionBannerEnabledFlag,
  );

  const { navigate } = useNavigation();

  const { outputToken } = useSelector((state: RootState) =>
    earnSelectors.selectEarnTokenPair(state, asset),
  );

  const experienceType = outputToken?.experience?.type;

  const {
    annualRewardRate,
    lifetimeRewards,
    lifetimeRewardsFiat,
    estimatedAnnualEarnings,
    estimatedAnnualEarningsFiat,
    isLoadingEarningsData,
    hasEarnings,
  } = useEarnings({ asset });

  const onDisplayAnnualRateTooltip = () => {
    if (experienceType === EARN_EXPERIENCES.STABLECOIN_LENDING) {
      navigate(
        Routes.EARN.MODALS.LENDING_LEARN_MORE,
        // @ts-expect-error - outputToken can be undefined, handle case
        { asset: outputToken },
      );
    } else if (experienceType === EARN_EXPERIENCES.POOLED_STAKING) {
      navigate('StakeModalStack', {
        screen: Routes.STAKING.MODALS.LEARN_MORE,
        params: { chainId: asset?.chainId },
      });
    }
  };

  if (!hasEarnings) return <></>;

  return (
    <View style={styles.earningsContainer}>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('stake.your_earnings')}
      </Text>
      <View>
        {(isEarnLendingServiceInterruptionBannerEnabled ||
          isPooledStakingServiceInterruptionBannerEnabled) && (
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
              hitSlop={styles.hitSlop}
              testID="annual-rate-tooltip"
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
                  EVENT_LOCATIONS.LENDING_EARNINGS,
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
        {experienceType === EARN_EXPERIENCES.POOLED_STAKING && (
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
                  <Text variant={TextVariant.BodyMD}>
                    {lifetimeRewardsFiat}
                  </Text>
                  <Text
                    variant={TextVariant.BodySMMedium}
                    color={TextColor.Alternative}
                  >
                    {lifetimeRewards}
                  </Text>
                </>
              )}
            </View>
          </View>
        )}
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
                  {estimatedAnnualEarnings}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
      {experienceType === EARN_EXPERIENCES.POOLED_STAKING && (
        <EarningsHistoryButton asset={asset} />
      )}
    </View>
  );
};

export const Earnings = ({ asset }: EarningsProps) => (
  <View>
    <EarningsContent asset={asset} />
  </View>
);

export default Earnings;
