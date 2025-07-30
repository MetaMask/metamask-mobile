import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { useSelector } from 'react-redux';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { useTheme } from '../../../util/theme';
import type { Colors } from '../../../util/theme/models';
import rewardsCover from '../../../images/rewards/rewards-cover.png';
import { useRewardsSeason } from '../../../core/Engine/controllers/rewards-controller/hooks/useRewardsSeason';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import {
  formatSeasonEndDate,
  SOLANA_SIGNUP_NOT_SUPPORTED,
} from '../../../util/rewards';

interface RewardsHeroProps {
  onOptIn: () => void;
  loginError?: string | null;
  onClearError?: () => void;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    heroContainer: {
      backgroundColor: colors.background.alternative,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    coverImage: {
      width: '100%',
      height: 400,
      resizeMode: 'cover',
      marginBottom: 24,
    },
    contentContainer: {
      paddingHorizontal: 16,
    },
    heroTitle: {
      fontSize: 28,
      color: colors.text.default,
      marginBottom: 12,
      fontWeight: 500,
    },
    heroDescription: {
      fontSize: 18,
      color: colors.text.default,
      lineHeight: 28,
      marginBottom: 16,
    },
    seasonEndText: {
      fontSize: 16,
      color: colors.text.muted,
      marginBottom: 32,
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success.muted,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    liveBadgeText: {
      fontWeight: '600',
      color: colors.success.default,
      marginLeft: 4,
    },
    ctaButtonContainer: {
      marginBottom: 16,
    },
    errorBanner: {
      marginBottom: 16,
    },
  });

const RewardsHero: React.FC<RewardsHeroProps> = ({
  onOptIn,
  loginError,
  onClearError,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const address = useSelector(selectSelectedInternalAccountAddress);
  const isSolanaAccount = address ? isSolanaAddress(address) : false;

  const { seasonData } = useRewardsSeason();
  const name = seasonData?.name || 'Upcoming Season';
  const endDate = seasonData?.endDate;

  return (
    <View style={styles.heroContainer}>
      <Image source={rewardsCover} style={styles.coverImage} />
      <View style={styles.contentContainer}>
        {seasonData && (
          <View style={styles.liveBadge}>
            <Icon
              name={IconName.StarFilled}
              size={IconSize.Xs}
              color={colors.success.default}
            />
            <Text style={styles.liveBadgeText}>Live</Text>
          </View>
        )}
        <Text style={styles.heroTitle}>{name}</Text>

        <Text style={styles.heroDescription}>
          Join thousands of users earning rewards through staking, liquidity
          provision, and exclusive MetaMask programs.
        </Text>

        <Text style={styles.seasonEndText}>{formatSeasonEndDate(endDate)}</Text>

        {loginError && (
          <BannerAlert
            severity={BannerAlertSeverity.Error}
            description={loginError}
            onClose={onClearError}
            style={styles.errorBanner}
          />
        )}

        {isSolanaAccount && (
          <BannerAlert
            severity={BannerAlertSeverity.Info}
            description={SOLANA_SIGNUP_NOT_SUPPORTED}
            style={styles.errorBanner}
          />
        )}

        <View style={styles.ctaButtonContainer}>
          <Button
            variant={ButtonVariants.Primary}
            label="Sign Up!"
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={onOptIn}
            disabled={isSolanaAccount}
          />
        </View>
      </View>
    </View>
  );
};

export default RewardsHero;
