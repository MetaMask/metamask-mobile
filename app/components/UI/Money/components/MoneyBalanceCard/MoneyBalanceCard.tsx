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
  SensitiveText,
  SensitiveTextLength,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../component-library/hooks';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectMoneyOnboardingSeen } from '../../../../../reducers/user/selectors';
import { selectHasWalletFundingPrimaryCta } from '../../selectors/homePrimaryCta';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../hooks/useMoneyAccountInfo';
import styleSheet from './MoneyBalanceCard.styles';
import { MoneyBalanceCardTestIds } from './MoneyBalanceCard.testIds';
import { useMoneyNavigation } from '../../hooks/useMoneyNavigation';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import Logger from '../../../../../util/Logger';
import {
  SCREEN_NAMES,
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
} from '../../constants/moneyEvents';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../../selectors/featureFlagController/moneyAccount';
import { MoneyPostOnboardingRedirectType } from '../../types/navigation';

const MoneyBalanceCard = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const hasSeenMoneyCardRef = useRef(false);
  const { styles } = useStyles(styleSheet, {});
  const {
    totalFiatRaw,
    totalFiatFormatted,
    apyPercent,
    isBalanceLoading,
    isBalanceFetchError,
    isBalanceFetching,
    refetchBalance,
    vaultApyQuery,
  } = useMoneyAccountBalance();
  const { hasMoneyAccount } = useMoneyAccountInfo();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const hasSeenMoneyOnboarding = useSelector(selectMoneyOnboardingSeen);
  const isOnboardingEnabled = useSelector(
    selectMoneyOnboardingStepperAnimationEnabled,
  );
  const hasOtherPrimaryCtaOnHome = useSelector(
    selectHasWalletFundingPrimaryCta,
  );
  const privacyMode = useSelector(selectPrivacyMode);

  const {
    trackButtonClicked,
    trackSurfaceClicked,
    trackComponentViewed,
    trackTooltipClicked,
  } = useMoneyAnalytics({
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
    !isBalanceLoading &&
    totalFiatFormatted === undefined;

  // Genuinely zero balance — distinct from unavailable.
  const isEmpty =
    hasMoneyAccount &&
    !isBalanceFetchError &&
    !isUnavailable &&
    totalFiatRaw === '0';

  const balanceText = totalFiatFormatted ?? '';

  const buttonLabelKey = 'money.balance_card.add';
  const buttonTestId = MoneyBalanceCardTestIds.ADD_BUTTON;

  let buttonVariant: ButtonVariant;
  let containerTestId: string;

  if (!hasMoneyAccount || isError || isRetrying) {
    buttonVariant = ButtonVariant.Secondary;
    containerTestId = MoneyBalanceCardTestIds.ERROR_CONTAINER;
  } else if (isUnavailable) {
    buttonVariant = ButtonVariant.Secondary;
    containerTestId = MoneyBalanceCardTestIds.UNAVAILABLE_CONTAINER;
  } else if (isEmpty) {
    buttonVariant = hasOtherPrimaryCtaOnHome
      ? ButtonVariant.Secondary
      : ButtonVariant.Primary;
    containerTestId = MoneyBalanceCardTestIds.EMPTY_CONTAINER;
  } else {
    buttonVariant = hasOtherPrimaryCtaOnHome
      ? ButtonVariant.Secondary
      : ButtonVariant.Primary;
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
      redirect_target:
        hasSeenMoneyOnboarding || !isOnboardingEnabled
          ? SCREEN_NAMES.MONEY_HOME
          : SCREEN_NAMES.MONEY_ONBOARDING,
    });
    navigateToMoneyHome();
  }, [
    hasSeenMoneyOnboarding,
    isOnboardingEnabled,
    navigateToMoneyHome,
    trackSurfaceClicked,
  ]);

  const handleAddPress = useCallback(async () => {
    const redirectedToOnboarding =
      !hasSeenMoneyOnboarding && isOnboardingEnabled;

    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: redirectedToOnboarding
        ? MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING
        : MONEY_BUTTON_INTENTS.ADD_MONEY,
      label_key: buttonLabelKey,
      redirect_target: redirectedToOnboarding
        ? SCREEN_NAMES.MONEY_ONBOARDING
        : SCREEN_NAMES.MONEY_DEPOSIT,
    });

    if (redirectedToOnboarding) {
      navigation.navigate(Routes.MONEY.ONBOARDING, {
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
        },
      });
      return;
    }

    try {
      await initiateDeposit();
    } catch (error) {
      Logger.error(error as Error, {
        message: '[MoneyBalanceCard] Failed to initiate deposit',
      });
    }
  }, [
    hasSeenMoneyOnboarding,
    initiateDeposit,
    isOnboardingEnabled,
    navigation,
    trackButtonClicked,
  ]);

  const handleInfoPress = useCallback(() => {
    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.MONEY_BALANCE,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MONEY_BALANCE_INFO_SHEET,
    });
  }, [navigation, trackTooltipClicked]);

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
    if (isBalanceLoading || isRetrying) {
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
      <SensitiveText
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        isHidden={privacyMode}
        length={SensitiveTextLength.Medium}
        numberOfLines={1}
        twClassName="shrink"
        testID={MoneyBalanceCardTestIds.BALANCE}
      >
        {balanceText}
      </SensitiveText>
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
      <Box twClassName="min-w-0 flex-1 gap-1 pr-3">
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
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            testID={MoneyBalanceCardTestIds.CURRENCY_SUFFIX}
          >
            {strings('money.balance_card.currency_suffix')}
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
              twClassName="shrink-0"
              testID={MoneyBalanceCardTestIds.APY_TAG_SKELETON}
            />
          ) : (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
              twClassName="shrink-0"
              testID={MoneyBalanceCardTestIds.APY_TAG}
            >
              {strings('money.apy_label', { percentage: apyPercent ?? 0 })}
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
          onPress={handleAddPress}
        >
          {strings(buttonLabelKey)}
        </Button>
      </Box>
    </Pressable>
  );
};

export default MoneyBalanceCard;
