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
      'Reward rate',
      'Expected yearly increase in the value of your stake, based on the reward rate over the past week.',
    );

  return (
    <View>
      {/* Title & Subtitle */}
      <Title style={styles.sectionTitle}>ETH earnings</Title>
      <View style={styles.sectionSubtitleContainer}>
        <Text style={styles.rewardRate}>Earning 2.6%</Text>
        <ButtonIcon
          size={ButtonIconSizes.Sm}
          iconColor={IconColor.Muted}
          iconName={IconName.Info}
          accessibilityRole="button"
          onPress={onNavigateToTooltipModal}
        />
      </View>
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.stakingOverviewContainer}>
          <Text style={styles.fiatAndPercentageTitle}>Staked amount</Text>
          <Text variant={TextVariant.BodyMDBold} style={styles.stakedAmountEth}>
            4.999964 ETH
          </Text>
          <View style={styles.fiatAndPercentageContainer}>
            <Text style={styles.fiatAndPercentageText}>$13,292.20</Text>
            <Text style={styles.fiatAndPercentageText}>•</Text>
            <Text style={styles.fiatAndPercentageText}>99% staked</Text>
          </View>
        </View>
        {/* Button Wrapper */}
        <View style={styles.buttonWrapper}>
          <Button
            style={styles.button}
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            label="Stake"
            accessibilityRole="button"
            onPress={onStake}
          />
          <Button
            style={styles.button}
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            label="Unstake"
            accessibilityRole="button"
            onPress={onUnstake}
          />
        </View>
        <View style={styles.bannerGroupContainer}>
          {shouldShowUnstakeBanner && (
            <BannerAlert
              severity={BannerAlertSeverity.Info}
              description={
                <Text variant={TextVariant.BodySM}>
                  Unstaking 2.381034 ETH in progress. Come back in 4 days and 2
                  hours to claim it.
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
                    You can now claim 2.381034 ETH. Once claimed, you&apos;ll
                    receive your ETH back in your wallet.
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
          title="Lifetime rewards"
          amount="0.0002"
          symbol="ETH"
          footer="$2.00 • Since 8/24"
        />
        <RewardsCard
          title="Est. annual rewards"
          amount="0.13"
          symbol="ETH"
          footer="$334.93"
        />
      </View>
    </View>
  );
};

export default StakingEarnings;
