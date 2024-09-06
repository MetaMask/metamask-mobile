import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './StakingEarnings.styles';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import useTooltipModal from '../../../../components/hooks/useTooltipModal';
import { strings } from '../../../../../locales/i18n';
import { isPooledStakingFeatureEnabled } from '../../Stake/constants';
import Title from '../../../Base/Title';

// TODO: Remove mock data when connecting component to backend.
const MOCK_DATA = {
  ANNUAL_EARNING_RATE: '2.6%',
  LIFETIME_REWARDS: {
    FIAT: '$2',
    ETH: '0.02151 ETH',
  },
  EST_ANNUAL_EARNINGS: {
    FIAT: '$15.93',
    ETH: '0.0131 ETH',
  },
};

const StakingEarnings = () => {
  // TODO: Remove mock data when connecting component to backend.
  const { ANNUAL_EARNING_RATE, LIFETIME_REWARDS, EST_ANNUAL_EARNINGS } =
    MOCK_DATA;

  const { styles } = useStyles(styleSheet, {});

  const { openTooltipModal } = useTooltipModal();

  const onNavigateToTooltipModal = () =>
    openTooltipModal(
      'Annual Rate',
      strings('tooltip_modal.reward_rate.tooltip'),
    );

  if (isPooledStakingFeatureEnabled()) return <></>;

  return (
    <View style={styles.stakingEarningsContainer}>
      <Title style={styles.title}>{strings('staking.your_earnings')}</Title>
      <View>
        {/* Annual Rate */}
        <View style={styles.keyValueRow}>
          <View style={styles.keyValuePrimaryTextWrapper}>
            <Text
              variant={TextVariant.BodyMDMedium}
              style={styles.keyValuePrimaryText}
            >
              {strings('staking.annual_rate')}
            </Text>
            <ButtonIcon
              size={ButtonIconSizes.Sm}
              iconColor={IconColor.Muted}
              iconName={IconName.Info}
              accessibilityRole="button"
              accessibilityLabel={strings(
                'staking.accessibility_labels.stake_annual_rate_tooltip',
              )}
              onPress={onNavigateToTooltipModal}
            />
          </View>
          <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
            {ANNUAL_EARNING_RATE}
          </Text>
        </View>
        <View style={styles.keyValueRow}>
          <View style={styles.keyValuePrimaryTextWrapperCentered}>
            <Text
              variant={TextVariant.BodyMDMedium}
              style={styles.keyValuePrimaryText}
            >
              {strings('staking.lifetime_rewards')}
            </Text>
          </View>
          <View style={styles.keyValueSecondaryText}>
            <Text variant={TextVariant.BodyMD}>{LIFETIME_REWARDS.FIAT}</Text>
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {LIFETIME_REWARDS.ETH}
            </Text>
          </View>
        </View>
        <View style={styles.keyValueRow}>
          <View style={styles.keyValuePrimaryTextWrapperCentered}>
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Alternative}
            >
              {strings('staking.estimated_annual_earnings')}
            </Text>
          </View>
          <View style={styles.keyValueSecondaryText}>
            <Text variant={TextVariant.BodyMD}>{EST_ANNUAL_EARNINGS.FIAT}</Text>
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {EST_ANNUAL_EARNINGS.ETH}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default StakingEarnings;
