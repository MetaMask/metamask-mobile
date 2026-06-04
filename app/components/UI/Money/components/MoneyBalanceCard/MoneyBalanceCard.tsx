import React, { useCallback, useRef, useEffect } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../component-library/hooks';
import { selectMoneyOnboardingSeen } from '../../../../../reducers/user/selectors';
import { selectWalletHomeOnboardingFlowVisible } from '../../../../../selectors/onboarding';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../hooks/useMoneyAccountInfo';
import styleSheet from './MoneyBalanceCard.styles';
import { MoneyBalanceCardTestIds } from './MoneyBalanceCard.testIds';
import { useMoneyNavigation } from '../../hooks/useMoneyNavigation';
import {
  SCREEN_NAMES,
  COMPONENT_NAMES,
  BOTTOM_SHEET_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
} from '../../constants/moneyEvents';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';

const MoneyBalanceCard = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const hasSeenMoneyCardRef = useRef(false);
  const { styles } = useStyles(styleSheet, {});
  const {
    totalFiatRaw,
    totalFiatFormatted,
    apyPercent,
    isAggregatedBalanceLoading,
    isBalanceFetchError,
    isBalanceFetching,
    refetchBalance,
    vaultApyQuery,
  } = useMoneyAccountBalance();
  const { hasMoneyAccount } = useMoneyAccountInfo();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const hasSeenMoneyOnboarding = useSelector(selectMoneyOnboardingSeen);
  const hasOtherPrimaryCtaOnHome = useSelector(
    selectWalletHomeOnboardingFlowVisible,
  );

  const { trackButtonClicked, trackSurfaceClicked, trackComponentViewed } =
    useMoneyAnalytics({
      screen_name: SCREEN_NAMES.WALLET_HOME,
      component_name: COMPONENT_NAMES.MONEY_BALANCE_CARD,
    });

  const isRetrying =
    hasMoneyAccount && isBalanceFetchError && isBalanceFetching;
  const isError = hasMoneyAccount && isBalanceFetchError && !isBalanceFetching;

  // Queries succeeded (no error, not loading) but a dependency required to
  // format the balance (e.g. musdFiatRate) is missing.
  const isUnavailable =
    hasMoneyAccount &&
    !isBalanceFetchError &&
    !isAggregatedBalanceLoading &&
    totalFiatFormatted === undefined;

  // Genuinely zero balance — distinct from unavailable.
  const isEmpty =
    hasMoneyAccount &&
    !isBalanceFetchError &&
    !isUnavailable &&
    totalFiatRaw === '0';

  const isNewUser = isEmpty && !hasSeenMoneyOnboarding;

  const balanceText = totalFiatFormatted ?? '';

  let buttonVariant: ButtonVariant;
  let buttonLabelLocalized: string;
  let buttonLabelEn: string;
  let buttonTestId: string;
  let containerTestId: string;

  if (!hasMoneyAccount || isError || isRetrying) {
    buttonVariant = ButtonVariant.Secondary;
    buttonLabelLocalized = strings('money.balance_card.add');
    buttonLabelEn = strings('money.balance_card.add', { locale: 'en' });
    buttonTestId = MoneyBalanceCardTestIds.ADD_BUTTON;
    containerTestId = MoneyBalanceCardTestIds.ERROR_CONTAINER;
  } else if (isUnavailable) {
    buttonVariant = ButtonVariant.Secondary;
    buttonLabelLocalized = strings('money.balance_card.add');
    buttonLabelEn = strings('money.balance_card.add', { locale: 'en' });
    buttonTestId = MoneyBalanceCardTestIds.ADD_BUTTON;
    containerTestId = MoneyBalanceCardTestIds.UNAVAILABLE_CONTAINER;
  } else if (isNewUser) {
    buttonVariant = hasOtherPrimaryCtaOnHome
      ? ButtonVariant.Secondary
      : ButtonVariant.Primary;
    const newUserLabelKey = hasOtherPrimaryCtaOnHome
      ? 'homepage.sections.money_empty_state.get_started'
      : 'homepage.sections.money_empty_state.earn';
    buttonLabelLocalized = strings(newUserLabelKey);
    buttonLabelEn = strings(newUserLabelKey, { locale: 'en' });
    buttonTestId = hasOtherPrimaryCtaOnHome
      ? MoneyBalanceCardTestIds.GET_STARTED_BUTTON
      : MoneyBalanceCardTestIds.EARN_BUTTON;
    containerTestId = MoneyBalanceCardTestIds.NEW_USER_CONTAINER;
  } else if (isEmpty) {
    buttonVariant = hasOtherPrimaryCtaOnHome
      ? ButtonVariant.Secondary
      : ButtonVariant.Primary;
    buttonLabelLocalized = strings('homepage.sections.money_empty_state.earn');
    buttonLabelEn = strings('homepage.sections.money_empty_state.earn', {
      locale: 'en',
    });
    buttonTestId = MoneyBalanceCardTestIds.EARN_BUTTON;
    containerTestId = MoneyBalanceCardTestIds.EMPTY_CONTAINER;
  } else {
    buttonVariant = hasOtherPrimaryCtaOnHome
      ? ButtonVariant.Secondary
      : ButtonVariant.Primary;
    buttonLabelLocalized = strings('money.balance_card.add');
    buttonLabelEn = strings('money.balance_card.add', { locale: 'en' });
    buttonTestId = MoneyBalanceCardTestIds.ADD_BUTTON;
    containerTestId = MoneyBalanceCardTestIds.FUNDED_CONTAINER;
  }

  useEffect(() => {
    if (hasSeenMoneyCardRef.current) {
      return;
    }
    hasSeenMoneyCardRef.current = true;
    trackComponentViewed();
  }, [trackComponentViewed]);

  const handleCardPress = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_BALANCE_CARD,
      redirect_target: hasSeenMoneyOnboarding
        ? SCREEN_NAMES.MONEY_HOME
        : SCREEN_NAMES.MONEY_ONBOARDING,
    });
    navigateToMoneyHome();
  }, [hasSeenMoneyOnboarding, navigateToMoneyHome, trackSurfaceClicked]);

  const handleAddPress = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
      label_en: buttonLabelEn,
      label_localized: buttonLabelLocalized,
      redirect_target: BOTTOM_SHEET_NAMES.MONEY_ADD_MONEY_SHEET,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  }, [buttonLabelEn, buttonLabelLocalized, navigation, trackButtonClicked]);

  const handleGetStartedPress = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.GET_STARTED,
      label_en: buttonLabelEn,
      label_localized: buttonLabelLocalized,
      redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
    });

    navigateToMoneyHome();
  }, [
    buttonLabelEn,
    buttonLabelLocalized,
    navigateToMoneyHome,
    trackButtonClicked,
  ]);

  const handleButtonPress = isNewUser ? handleGetStartedPress : handleAddPress;

  const handleInfoPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MONEY_BALANCE_INFO_SHEET,
    });
  }, [navigation]);

  const renderBalanceSlot = () => {
    if (!hasMoneyAccount) {
      return (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          testID={MoneyBalanceCardTestIds.BALANCE_NO_ACCOUNT}
        >
          {strings('money.balance_no_account')}
        </Text>
      );
    }
    if (isAggregatedBalanceLoading || isRetrying) {
      return (
        <Skeleton
          height={24}
          width={100}
          testID={MoneyBalanceCardTestIds.BALANCE_SKELETON}
        />
      );
    }
    if (isError) {
      return (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
          testID={MoneyBalanceCardTestIds.BALANCE_ERROR}
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('money.balance_unavailable')}
          </Text>
          <ButtonIcon
            iconName={IconName.Refresh}
            iconProps={{ color: IconColor.InfoDefault, size: IconSize.Sm }}
            size={ButtonIconSize.Sm}
            onPress={refetchBalance}
            accessibilityLabel={strings('money.balance_retry')}
            testID={MoneyBalanceCardTestIds.BALANCE_RETRY}
          />
        </Box>
      );
    }
    if (isUnavailable) {
      return (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          testID={MoneyBalanceCardTestIds.BALANCE_UNAVAILABLE}
        >
          {strings('money.balance_unavailable')}
        </Text>
      );
    }
    return (
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        testID={MoneyBalanceCardTestIds.BALANCE}
      >
        {balanceText}
      </Text>
    );
  };

  return (
    <Pressable
      testID={containerTestId}
      onPress={handleCardPress}
      style={({ pressed }) => [
        styles.container,
        tw.style(
          'flex-row items-center justify-between bg-muted',
          pressed && 'opacity-80',
        ),
      ]}
    >
      <Box twClassName="flex-1 gap-1 pr-3">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            testID={MoneyBalanceCardTestIds.LABEL}
          >
            {strings('money.balance_card.label')}
          </Text>
          <ButtonIcon
            iconName={IconName.Info}
            iconProps={{ color: IconColor.IconAlternative, size: IconSize.Sm }}
            size={ButtonIconSize.Sm}
            onPress={handleInfoPress}
            accessibilityLabel={strings('money.balance_card.info_sheet_title')}
            testID={MoneyBalanceCardTestIds.INFO_BUTTON}
          />
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.End}
          twClassName="gap-2"
        >
          {renderBalanceSlot()}
          {vaultApyQuery.isLoading ? (
            <Skeleton
              height={20}
              width={60}
              testID={MoneyBalanceCardTestIds.APY_TAG_SKELETON}
            />
          ) : (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
              testID={MoneyBalanceCardTestIds.APY_TAG}
            >
              {strings('money.apy_label', { percentage: apyPercent ?? 0 })}
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {strings('money.apy_currency_suffix')}
              </Text>
            </Text>
          )}
        </Box>
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.End}
      >
        <Button
          testID={buttonTestId}
          variant={buttonVariant}
          size={ButtonSize.Md}
          onPress={handleButtonPress}
        >
          {buttonLabelLocalized}
        </Button>
      </Box>
    </Pressable>
  );
};

export default MoneyBalanceCard;
