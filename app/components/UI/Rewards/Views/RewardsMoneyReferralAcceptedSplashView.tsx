import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import RewardsThemeImageComponent from '../components/ThemeImageComponent/RewardsThemeImageComponent';
import { useSessionProfileId } from '../hooks/useReferralMe';
import { selectReferralMeEntry } from '../../../../reducers/rewardsMoney/selectors';
import { formatRewardsDateLabel } from '../utils/formatUtils';
import { exitRewardsFlow } from '../utils';

export const REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS = {
  CONTAINER: 'rewards-money-referral-accepted-splash',
  CLOSE: 'rewards-money-referral-accepted-close',
  TITLE: 'rewards-money-referral-accepted-title',
  BODY: 'rewards-money-referral-accepted-body',
  HERO: 'rewards-money-referral-accepted-hero',
  START_TRADING: 'rewards-money-referral-accepted-start-trading',
  VIEW_REWARDS: 'rewards-money-referral-accepted-view-rewards',
} as const;

// The preset has no tracking-* utilities, and the uppercase eyebrow needs the
// extra letter spacing to stay legible at BodySm.
const eyebrowTrackingStyle = { letterSpacing: 0.8 };

/**
 * `{date}` is the full trailing time phrase so both forms stay grammatical:
 * `through <formatted earning_end>` or `for a limited time`.
 */
export function fillInviteAcceptedBodyDate(
  template: string,
  earningEnd: string | null | undefined,
): string {
  if (!template.includes('{date}')) {
    return template;
  }
  let datePhrase = 'for a limited time';
  if (earningEnd) {
    const parsed = new Date(earningEnd);
    if (!Number.isNaN(parsed.getTime())) {
      datePhrase = `through ${formatRewardsDateLabel(parsed)}`;
    }
  }
  return template.replaceAll('{date}', datePhrase);
}

const RewardsMoneyReferralAcceptedSplashViewContent: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { profileId } = useSessionProfileId();
  const referralMeEntry = useSelector((state: RootState) =>
    selectReferralMeEntry(state, profileId),
  );
  const referralMe = referralMeEntry?.data;
  const localizedText = referralMe?.localized_text;
  const inviteHero = referralMe?.invite_hero;

  const body = useMemo(
    () =>
      fillInviteAcceptedBodyDate(
        localizedText?.inviteAcceptedBody ?? '',
        referralMe?.referred_by?.earning_end,
      ),
    [localizedText?.inviteAcceptedBody, referralMe?.referred_by?.earning_end],
  );

  const handleDismiss = useCallback(() => {
    exitRewardsFlow(navigation);
  }, [navigation]);

  const handleStartTrading = useCallback(() => {
    exitRewardsFlow(navigation);
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
      params: { hasBottomNotch: false },
    });
  }, [navigation]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CONTAINER}
    >
      <Box alignItems={BoxAlignItems.End} twClassName="px-4 pt-3">
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Sm}
          onPress={handleDismiss}
          accessibilityLabel={localizedText?.inviteAcceptedCloseA11y ?? ''}
          testID={REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CLOSE}
        />
      </Box>

      <Box alignItems={BoxAlignItems.Center} twClassName="px-6 pt-2">
        {Boolean(localizedText?.inviteAcceptedEyebrow) && (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.SuccessDefault}
            twClassName="uppercase text-center"
            style={eyebrowTrackingStyle}
          >
            {localizedText?.inviteAcceptedEyebrow}
          </Text>
        )}
        {Boolean(localizedText?.inviteAcceptedTitle) && (
          <Text
            variant={TextVariant.DisplayMd}
            fontWeight={FontWeight.Bold}
            twClassName="mt-2 text-center"
            testID={REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.TITLE}
          >
            {localizedText?.inviteAcceptedTitle}
          </Text>
        )}
        {Boolean(body) && (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-3 text-center"
            testID={REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.BODY}
          >
            {body}
          </Text>
        )}
      </Box>

      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1 px-6 py-8"
        testID={REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.HERO}
      >
        {inviteHero && (
          <RewardsThemeImageComponent
            themeImage={inviteHero}
            style={tw.style('h-full w-full max-w-80')}
          />
        )}
      </Box>

      <Box twClassName="gap-3 px-4 pb-4">
        {Boolean(localizedText?.inviteAcceptedStartTrading) && (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleStartTrading}
            testID={
              REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.START_TRADING
            }
          >
            {localizedText?.inviteAcceptedStartTrading}
          </Button>
        )}
        {Boolean(localizedText?.inviteAcceptedViewRewards) && (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleDismiss}
            testID={
              REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.VIEW_REWARDS
            }
          >
            {localizedText?.inviteAcceptedViewRewards}
          </Button>
        )}
      </Box>
    </SafeAreaView>
  );
};

const RewardsMoneyReferralAcceptedSplashView: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();

  return (
    <ErrorBoundary
      navigation={navigation}
      view="RewardsMoneyReferralAcceptedSplashView"
    >
      <RewardsMoneyReferralAcceptedSplashViewContent />
    </ErrorBoundary>
  );
};

export default RewardsMoneyReferralAcceptedSplashView;
