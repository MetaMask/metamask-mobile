import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Title from '../../../Base/Title';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './StakingEarnings.styles';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import BannerAlert from '../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../component-library/components/Banners/Banner';
import useTooltipModal from '../../../../components/hooks/useTooltipModal';
import RewardsCard from './RewardsCard';
import { strings } from '../../../../../locales/i18n';

// TODO: Remove mock data when connecting component to backend.
const MOCK_DATA = {
  UNSTAKING_REQUESTS: [
    { id: 1, ethAmount: '2.3', time: '4 days and 2 hours' },
    // { id: 2, ethAmount: '1.6', time: '3 days and 8 hours' },
  ],
  STAKED_ETH: 4.999964,
  STAKED_FIAT_VALUE: '13,292.20',
  PERCENT_OF_ETH_STAKED: 99,
  UNCLAIMED_ETH: 2.381034,
  EARNING_RATE: 2.6,
  LIFETIME_REWARDS: {
    ETH: 0.0002,
    FIAT: '2.00',
    DATE: '8/24',
  },
  EST_ANNUAL_REWARDS: {
    ETH: 0.13,
    FIAT: 334.93,
  },
};

const StakingEarnings: React.FC<unknown> = () => {
  // TODO: Remove mock data when connecting component to backend.
  const {
    UNSTAKING_REQUESTS,
    STAKED_ETH,
    STAKED_FIAT_VALUE,
    PERCENT_OF_ETH_STAKED,
    UNCLAIMED_ETH,
    EARNING_RATE,
    LIFETIME_REWARDS,
    EST_ANNUAL_REWARDS,
  } = MOCK_DATA;

  const { styles } = useStyles(styleSheet, {});
  const { openTooltipModal } = useTooltipModal();

  const onStake = () => openTooltipModal('TODO', 'Implement onStake handler');

  const onUnstake = () =>
    openTooltipModal('TODO', 'Implement onUntake handler');

  const onClaimEth = () => openTooltipModal('TODO', 'onClaimEth handler');

  const onNavigateToTooltipModal = () =>
    openTooltipModal(
      strings('tooltip_modal.reward_rate.title'),
      strings('tooltip_modal.reward_rate.tooltip'),
    );

  return (
    <View>
      {/* Title & Subtitle */}
      <Title style={styles.sectionTitle}>
        {strings('staking.eth_earnings')}
      </Title>
      <View style={styles.sectionSubtitleContainer}>
        <Text style={styles.rewardRate}>
          {strings('staking.earning_percentage', { percentage: EARNING_RATE })}
        </Text>
        <ButtonIcon
          size={ButtonIconSizes.Sm}
          iconColor={IconColor.Muted}
          iconName={IconName.Info}
          accessibilityRole="button"
          accessibilityLabel={strings(
            'staking.accessibility_labels.staked_earnings_rate_tooltip',
          )}
          onPress={onNavigateToTooltipModal}
        />
      </View>
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.stakingOverviewContainer}>
          <Text style={styles.fiatAndPercentageTitle}>
            {strings('staking.staked_amount')}
          </Text>
          <Text variant={TextVariant.BodyMDBold} style={styles.stakedAmountEth}>
            {STAKED_ETH} ETH
          </Text>
          <View style={styles.fiatAndPercentageContainer}>
            <Text style={styles.fiatAndPercentageText}>
              ${STAKED_FIAT_VALUE}
            </Text>
            <Text style={styles.fiatAndPercentageText}>•</Text>
            <Text style={styles.fiatAndPercentageText}>
              {PERCENT_OF_ETH_STAKED}% {strings('staking.staked')}
            </Text>
          </View>
        </View>
        {/* Button Wrapper */}
        <View style={styles.buttonWrapper}>
          <Button
            style={styles.button}
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            label={strings('staking.stake')}
            onPress={onStake}
            accessibilityRole="button"
            accessibilityLabel={strings(
              'staking.accessibility_labels.stake_eth_button',
            )}
          />
          <Button
            style={styles.button}
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            label={strings('staking.unstake')}
            onPress={onUnstake}
            accessibilityRole="button"
            accessibilityLabel={strings(
              'staking.accessibility_labels.unstake_eth_button',
            )}
          />
        </View>
        <View style={styles.bannerGroupContainer}>
          {/* TEMP: Show a banner for each in-progress unstaking request. */}
          {!!UNSTAKING_REQUESTS.length &&
            UNSTAKING_REQUESTS.map(({ ethAmount, time, id }) => (
              <BannerAlert
                key={id}
                severity={BannerAlertSeverity.Info}
                description={
                  <Text variant={TextVariant.BodySM}>
                    {strings('staking.unstake_in_progress_banner_text', {
                      eth_amount: ethAmount,
                      time,
                    })}
                  </Text>
                }
              />
            ))}
          {!!UNCLAIMED_ETH && (
            <BannerAlert
              severity={BannerAlertSeverity.Success}
              description={
                <>
                  <Text variant={TextVariant.BodySM}>
                    {strings('staking.claimable_eth_available_banner_text', {
                      eth_amount: UNCLAIMED_ETH,
                    })}
                  </Text>
                  <Button
                    width={75}
                    variant={ButtonVariants.Link}
                    label={
                      <Text
                        variant={TextVariant.BodyMDMedium}
                        color={TextColor.Primary}
                      >
                        Claim ETH
                      </Text>
                    }
                    onPress={onClaimEth}
                    accessibilityRole="button"
                    accessibilityLabel={strings(
                      'staking.accessibility_labels.claim_eth_button',
                    )}
                  />
                </>
              }
            />
          )}
        </View>
      </View>
      {/* Rewards Section */}
      <View style={styles.rewardCardsContainer}>
        <RewardsCard
          title={strings('staking.lifetime_rewards')}
          amount={LIFETIME_REWARDS.ETH.toString()}
          symbol="ETH"
          footer={strings('staking.rewards_history', {
            fiat_amount: LIFETIME_REWARDS.FIAT,
            date: LIFETIME_REWARDS.DATE,
          })}
        />
        <RewardsCard
          title={strings('staking.estimated_annual_rewards')}
          amount={EST_ANNUAL_REWARDS.ETH.toString()}
          symbol="ETH"
          footer={`$${EST_ANNUAL_REWARDS.FIAT.toString()}`}
        />
      </View>
    </View>
  );
};

export default StakingEarnings;
