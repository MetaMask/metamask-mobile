import React, { useCallback, useRef } from 'react';
import { Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
import Routes from '../../../../../constants/navigation/Routes';
import AppConstants from '../../../../../core/AppConstants';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { ensureError } from '../../../../../util/errorUtils';
import Logger from '../../../../../util/Logger';
import { useParams } from '../../../../../util/navigation/navUtils';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { MoneyFaqList } from '../../components/MoneyFaqList/MoneyFaqList';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  MONEY_URLS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { useMoneyHomeNavigation } from '../../hooks/useMoneyHomeNavigation';
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

const HERO_ASPECT_RATIO = 361 / 203;

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
    <Box twClassName="flex-1">
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
  const tw = useTailwind();
  const params = useParams<MoneySplashParams>();
  const postOnboardingRedirect = params?.postOnboardingRedirect;
  const analyticsContext = params?.analyticsContext;
  const isInfoMode = Boolean(params?.infoMode);
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const isOffline = networkTier === 'NONE';
  const showHero = !(hardwareTier === 'LOW' && isOffline);
  const { apyPercent } = useMoneyVaultApy({ enabled: !isOffline });
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { navigateToMoneyHome } = useMoneyHomeNavigation();
  const noFeeTokens = useSelector(selectMoneyNoFeeDepositTokens);
  const tokenBullets = formatNoFeeTokenBullets(noFeeTokens);

  const { trackScreenViewed, trackButtonClicked, trackTooltipClicked } =
    useMoneyAnalytics({
      screen_name: SCREEN_NAMES.MONEY_SPLASH,
    });

  useMountEffect(() => {
    if (!isInfoMode) {
      dispatch(setMoneySplashSeen(true));
    }
  });
  useMountEffect(trackScreenViewed);

  const depositStartedRef = useRef(false);

  const goToMoneyHome = useCallback(() => {
    navigateToMoneyHome({
      skipOnboardingRedirect: true,
      ...(analyticsContext ? { analyticsContext } : {}),
    });
  }, [analyticsContext, navigateToMoneyHome]);

  const handleStartEarning = useCallback(() => {
    const isDepositRedirect =
      postOnboardingRedirect?.type === MoneyPostOnboardingRedirectType.DEPOSIT;

    if (isDepositRedirect && depositStartedRef.current) {
      return;
    }

    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: isDepositRedirect
        ? MONEY_BUTTON_INTENTS.ADD_MONEY
        : MONEY_BUTTON_INTENTS.GO_TO_MONEY_HOME,
      label_key: 'money.splash.cta',
      redirect_target: isDepositRedirect
        ? SCREEN_NAMES.MONEY_DEPOSIT
        : SCREEN_NAMES.MONEY_HOME,
    });

    if (!isDepositRedirect) {
      goToMoneyHome();
      return;
    }

    depositStartedRef.current = true;

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

  const handleApyPress = useCallback(() => {
    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.APY,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
      params: { apy: apyPercent, variant: 'deposit' },
    });
  }, [apyPercent, navigation, trackTooltipClicked]);

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
    <Box
      twClassName="flex-1 bg-default"
      testID={MoneySplashViewTestIds.CONTAINER}
    >
      <ScrollView
        contentContainerStyle={[
          tw.style('pb-6'),
          isInfoMode && { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="px-4" style={{ paddingTop: insets.top + 48 }}>
          {showHero && (
            <Box
              twClassName="w-full overflow-hidden rounded-2xl"
              style={{ aspectRatio: HERO_ASPECT_RATIO }}
            >
              <Image
                source={moneySplashHero}
                style={tw.style('h-full w-full')}
                resizeMode="cover"
                testID={MoneySplashViewTestIds.HERO}
              />
            </Box>
          )}
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="mt-6"
            testID={MoneySplashViewTestIds.EYEBROW}
          >
            {strings('money.splash.eyebrow')}
          </Text>
          <Text
            variant={TextVariant.DisplayMd}
            fontWeight={FontWeight.Bold}
            twClassName="mt-3"
            testID={MoneySplashViewTestIds.TITLE}
          >
            {strings('money.splash.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-4"
            testID={MoneySplashViewTestIds.BODY}
          >
            {apyPercent !== undefined ? (
              <>
                {strings('money.splash.body_prefix')}
                <Text
                  color={TextColor.SuccessDefault}
                  twClassName="underline decoration-dotted"
                  onPress={handleApyPress}
                  accessibilityRole="button"
                  testID={MoneySplashViewTestIds.APY_PRESSABLE}
                >
                  {strings('money.apy_label', { percentage: apyPercent })}
                </Text>
                {strings('money.splash.body_suffix')}
              </>
            ) : (
              strings('money.splash.body_no_apy')
            )}
          </Text>
        </Box>
        <Box twClassName="mt-6 px-4">
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
        {!isInfoMode && (
          <>
            <Box twClassName="my-5 h-px bg-border-muted" />
            <Box twClassName="px-4 pt-6 pb-5">
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
          </>
        )}
      </ScrollView>
      {!isInfoMode && (
        <Box
          twClassName="bg-default px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 16 }}
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
        </Box>
      )}
      <ButtonIcon
        iconName={IconName.Close}
        size={ButtonIconSize.Md}
        onPress={handleClose}
        accessibilityLabel={strings('money.splash.close')}
        testID={MoneySplashViewTestIds.CLOSE_BUTTON}
        twClassName={`absolute right-4 z-10 rounded-full ${
          isInfoMode ? 'bg-section' : 'bg-muted'
        }`}
        style={{ top: insets.top + 4 }}
      />
    </Box>
  );
};

export default MoneySplashView;
