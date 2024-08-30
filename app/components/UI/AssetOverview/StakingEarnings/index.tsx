import React, { useState } from 'react';
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

// TODO: Replace hardcoded strings with i18n support
// TODO: Do accessibility pass on components.
const StakingEarnings: React.FC<unknown> = () => {
  // For now, we want to show a banner for each unstaking request.
  const [shouldShowUnstakeBanner, setShowUnstakeBanner] = useState(true);
  const [shouldShowClaimBanner, setShowClaimBanner] = useState(true);

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
          {strings('staking.earning_percentage', { percentage: '2.6' })}
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
            4.999964 ETH
          </Text>
          <View style={styles.fiatAndPercentageContainer}>
            <Text style={styles.fiatAndPercentageText}>$13,292.20</Text>
            <Text style={styles.fiatAndPercentageText}>•</Text>
            <Text style={styles.fiatAndPercentageText}>
              99% {strings('staking.staked')}
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
          {shouldShowUnstakeBanner && (
            <BannerAlert
              severity={BannerAlertSeverity.Info}
              description={
                <Text variant={TextVariant.BodySM}>
                  {strings('staking.unstake_in_progress_banner_text', {
                    eth_amount: '2.3',
                    time: '4 days and 2 hours',
                  })}
                </Text>
              }
            />
          )}
          {shouldShowClaimBanner && (
            <BannerAlert
              severity={BannerAlertSeverity.Success}
              description={
                <>
                  <Text variant={TextVariant.BodySM}>
                    {strings('staking.claimable_eth_available_banner_text', {
                      eth_amount: '2.381034',
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
          amount="0.0002"
          symbol="ETH"
          footer={strings('staking.rewards_history', {
            fiat_amount: '2.00',
            date: '8/24',
          })}
        />
        <RewardsCard
          title={strings('staking.estimated_annual_rewards')}
          amount="0.13"
          symbol="ETH"
          footer="$334.93"
        />
      </View>
    </View>
  );
};

export default StakingEarnings;
