import React, { useCallback } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { setMoneySplashSeen } from '../../../../../actions/user';
import AppConstants from '../../../../../core/AppConstants';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { ensureError } from '../../../../../util/errorUtils';
import Logger from '../../../../../util/Logger';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useTheme } from '../../../../../util/theme';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { MoneyFaqList } from '../../components/MoneyFaqList/MoneyFaqList';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_URLS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { useMoneyNavigation } from '../../hooks/useMoneyNavigation';
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
import useMountEffect from '../../hooks/useMountEffect';
import { selectMoneyNoFeeDepositTokens } from '../../selectors/featureFlags';
import {
  MoneyPostOnboardingRedirectType,
  type MoneySplashParams,
} from '../../types/navigation';
import { formatNoFeeTokenBullets } from '../../utils/depositFaqTokens';
import { openInAppBrowser } from '../../utils/openInAppBrowser';
import moneySplashHero from '../../../../../images/money-splash-hero.png';
import { MoneySplashViewTestIds } from './MoneySplashView.testIds';
import { styles } from './MoneySplashView.styles';

const BENEFITS = [
  {
    title: 'money.splash.benefit_convert_title',
    body: 'money.splash.benefit_convert_body',
  },
  {
    title: 'money.splash.benefit_earn_title',
    body: 'money.splash.benefit_earn_body',
  },
  {
    title: 'money.splash.benefit_trade_title',
    body: 'money.splash.benefit_trade_body',
  },
  {
    title: 'money.splash.benefit_withdraw_title',
    body: 'money.splash.benefit_withdraw_body',
  },
  {
    title: 'money.splash.benefit_send_title',
    body: 'money.splash.benefit_send_body',
  },
] as const;

const BenefitRow = ({
  title,
  body,
  testID,
}: {
  title: string;
  body: string;
  testID: string;
}) => (
  <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-4" testID={testID}>
    <Icon
      name={IconName.Check}
      size={IconSize.Md}
      color={IconColor.SuccessDefault}
    />
    <Box style={styles.benefitText}>
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {title}
      </Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {body}
      </Text>
    </Box>
  </Box>
);

const MoneySplashView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { postOnboardingRedirect, analyticsContext } =
    useParams<MoneySplashParams>();
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const isOffline = networkTier === 'NONE';
  const showHero = !(hardwareTier === 'LOW' && isOffline);
  const { apyPercent } = useMoneyVaultApy({ enabled: !isOffline });
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const noFeeTokens = useSelector(selectMoneyNoFeeDepositTokens);
  const tokenBullets = formatNoFeeTokenBullets(noFeeTokens);

  const { trackScreenViewed, trackButtonClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_SPLASH,
  });

  useMountEffect(() => {
    dispatch(setMoneySplashSeen(true));
  });
  useMountEffect(trackScreenViewed);

  const goToMoneyHome = useCallback(() => {
    navigateToMoneyHome(analyticsContext ? { analyticsContext } : undefined);
  }, [analyticsContext, navigateToMoneyHome]);

  const handleStartEarning = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
      label_key: 'money.splash.cta',
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
    });

    if (
      postOnboardingRedirect?.type !== MoneyPostOnboardingRedirectType.DEPOSIT
    ) {
      goToMoneyHome();
      return;
    }

    initiateDeposit({
      preferredPaymentToken: postOnboardingRedirect.preferredPaymentToken,
      ...(postOnboardingRedirect.autoSelectFiatPayment !== undefined
        ? {
            autoSelectFiatPayment: postOnboardingRedirect.autoSelectFiatPayment,
          }
        : {}),
      ...(postOnboardingRedirect.intent
        ? { intent: postOnboardingRedirect.intent }
        : {}),
      replaceConfirmation: true,
      onDepositSetupFailure: goToMoneyHome,
    }).catch((error) => {
      Logger.error(
        ensureError(error, '[Money Splash] Deposit setup failed'),
        '[Money Splash] Failed to initiate deposit after splash',
      );
    });
  }, [
    goToMoneyHome,
    initiateDeposit,
    postOnboardingRedirect,
    trackButtonClicked,
  ]);

  const handleClose = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.ICON,
      button_intent: MONEY_BUTTON_INTENTS.DISMISS,
    });
    navigation.goBack();
  }, [navigation, trackButtonClicked]);

  const handleCardFeesPress = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.CARD_FEES,
      component_name: COMPONENT_NAMES.FAQ_ITEM,
      label_key: 'money.how_it_works_page.faq_a4_link',
      redirect_target: MONEY_URLS.CARD_FEES,
    });
    openInAppBrowser(navigation, AppConstants.CARD.CARD_FEES_URL);
  }, [navigation, trackButtonClicked]);

  return (
    <View
      style={[styles.root, { backgroundColor: colors.background.default }]}
      testID={MoneySplashViewTestIds.CONTAINER}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="px-4" style={{ paddingTop: insets.top + 48 }}>
          {showHero && (
            <View style={styles.heroContainer}>
              <Image
                source={moneySplashHero}
                style={styles.hero}
                resizeMode="cover"
                testID={MoneySplashViewTestIds.HERO}
              />
            </View>
          )}
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            style={styles.eyebrow}
            testID={MoneySplashViewTestIds.EYEBROW}
          >
            {strings('money.splash.eyebrow')}
          </Text>
          <Text
            variant={TextVariant.DisplayMd}
            fontWeight={FontWeight.Bold}
            style={styles.title}
            testID={MoneySplashViewTestIds.TITLE}
          >
            {strings('money.splash.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            style={styles.body}
            testID={MoneySplashViewTestIds.BODY}
          >
            {apyPercent !== undefined ? (
              <>
                {strings('money.splash.body_prefix')}
                <Text color={TextColor.SuccessDefault} style={styles.apy}>
                  {`${apyPercent}% APY`}
                </Text>
                {strings('money.splash.body_suffix')}
              </>
            ) : (
              strings('money.splash.body_no_apy')
            )}
          </Text>
        </Box>
        <Box twClassName="px-4" style={styles.benefits}>
          <Box twClassName="gap-4">
            {BENEFITS.map((benefit, index) => (
              <BenefitRow
                key={benefit.title}
                title={strings(benefit.title)}
                body={strings(benefit.body)}
                testID={MoneySplashViewTestIds.BENEFIT_ROW(index + 1)}
              />
            ))}
          </Box>
        </Box>
        <Box twClassName="bg-border-muted" style={styles.divider} />
        <Box twClassName="px-4" style={styles.faqTitle}>
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            testID={MoneySplashViewTestIds.FAQ_TITLE}
          >
            {strings('money.how_it_works_page.faq_title')}
          </Text>
        </Box>
        <MoneyFaqList
          apyPercent={apyPercent}
          tokenBullets={tokenBullets}
          onCardFeesPress={handleCardFeesPress}
          itemTestId={MoneySplashViewTestIds.FAQ_ITEM}
          linkTestId={MoneySplashViewTestIds.FAQ_LINK}
        />
      </ScrollView>
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.background.default,
          },
        ]}
      >
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleStartEarning}
          testID={MoneySplashViewTestIds.CTA}
        >
          {strings('money.splash.cta')}
        </Button>
      </View>
      <ButtonIcon
        iconName={IconName.Close}
        size={ButtonIconSize.Md}
        onPress={handleClose}
        accessibilityLabel={strings('money.splash.close')}
        testID={MoneySplashViewTestIds.CLOSE_BUTTON}
        twClassName="rounded-full bg-muted"
        style={[styles.closeButton, { top: insets.top + 4 }]}
      />
    </View>
  );
};

export default MoneySplashView;
