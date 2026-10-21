import React, { useCallback, useMemo } from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import referralShareHero from '../../../../images/rewards/referral-share-hero.png';
import { KOL_DASHBOARD_SELECTORS } from '../components/KolDashboard/KolDashboard.testIds';
import { KOL_INVITE_FIXTURE } from '../components/KolDashboard/rewardsUiFixtures';
import { formatRewardsDateLabel } from '../utils/formatUtils';
import { exitRewardsFlow } from '../utils';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// The preset has no tracking-* utilities, and the uppercase eyebrow needs the
// extra letter spacing to stay legible at BodySm.
const eyebrowTrackingStyle = { letterSpacing: 0.8 };

/**
 * Confirmation moment shown right after a referee accepts a referral invite.
 * The offer end date is derived from the invite fixture; engineers replace it
 * with the referral's real expiry once the referral state is wired up.
 */
const RewardsReferralAcceptedSplashViewContent: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  const offerEndsLabel = useMemo(
    () =>
      formatRewardsDateLabel(
        new Date(
          Date.now() +
            KOL_INVITE_FIXTURE.offerDurationDays * MILLISECONDS_PER_DAY,
        ),
      ),
    [],
  );

  // Popping the splash fades it back out over the dashboard it was pushed on.
  const handleDismiss = useCallback(() => {
    exitRewardsFlow(navigation);
  }, [navigation]);

  const handleStartTrading = useCallback(() => {
    exitRewardsFlow(navigation);
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
      // The notch points at the tab bar's trade button, which is not the
      // opening control here.
      params: { hasBottomNotch: false },
    });
  }, [navigation]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={KOL_DASHBOARD_SELECTORS.INVITE_ACCEPTED_SPLASH}
    >
      <Box alignItems={BoxAlignItems.End} twClassName="px-4 pt-3">
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Sm}
          onPress={handleDismiss}
          accessibilityLabel={strings('rewards.kol.invite_accepted_close_a11y')}
          testID={KOL_DASHBOARD_SELECTORS.INVITE_ACCEPTED_CLOSE}
        />
      </Box>

      <Box alignItems={BoxAlignItems.Center} twClassName="px-6 pt-2">
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.SuccessDefault}
          twClassName="uppercase text-center"
          style={eyebrowTrackingStyle}
        >
          {strings('rewards.kol.invite_accepted_eyebrow')}
        </Text>
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          twClassName="mt-2 text-center"
          testID={KOL_DASHBOARD_SELECTORS.INVITE_ACCEPTED_TITLE}
        >
          {strings('rewards.kol.invite_accepted_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-3 text-center"
          testID={KOL_DASHBOARD_SELECTORS.INVITE_ACCEPTED_BODY}
        >
          {strings('rewards.kol.invite_accepted_body', {
            date: offerEndsLabel,
          })}
        </Text>
      </Box>

      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1 px-6 py-8"
      >
        <Image
          source={referralShareHero}
          resizeMode="contain"
          style={tw.style('h-full w-full max-w-80')}
          accessibilityLabel={strings('rewards.kol.invite_illustration_label')}
        />
      </Box>

      <Box twClassName="gap-3 px-4 pb-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleStartTrading}
          testID={KOL_DASHBOARD_SELECTORS.INVITE_ACCEPTED_START_TRADING}
        >
          {strings('rewards.kol.invite_accepted_start_trading')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleDismiss}
          testID={KOL_DASHBOARD_SELECTORS.INVITE_ACCEPTED_VIEW_REWARDS}
        >
          {strings('rewards.kol.invite_accepted_view_rewards')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

const RewardsReferralAcceptedSplashView: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();

  return (
    <ErrorBoundary
      navigation={navigation}
      view="RewardsReferralAcceptedSplashView"
    >
      <RewardsReferralAcceptedSplashViewContent />
    </ErrorBoundary>
  );
};

export default RewardsReferralAcceptedSplashView;
