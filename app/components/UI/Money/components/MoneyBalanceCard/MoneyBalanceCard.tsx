import React, { useCallback } from 'react';
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

const MoneyBalanceCard = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
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
  const { isMoneyAccountFeatureEnabled, hasMoneyAccount } =
    useMoneyAccountInfo();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const hasSeenMoneyOnboarding = useSelector(selectMoneyOnboardingSeen);
  const walletHomeOnboardingFlowVisible = useSelector(
    selectWalletHomeOnboardingFlowVisible,
  );

  const isFeatureDisabled = !isMoneyAccountFeatureEnabled;
  const isNoAccount = isMoneyAccountFeatureEnabled && !hasMoneyAccount;
  const isRetrying =
    !isFeatureDisabled &&
    !isNoAccount &&
    isBalanceFetchError &&
    isBalanceFetching;
  const isError =
    !isFeatureDisabled &&
    !isNoAccount &&
    isBalanceFetchError &&
    !isBalanceFetching;

  // Skip isEmpty/isNewUser when fetch failed or account/feature unavailable — balance is unknown.
  const isEmpty =
    !isFeatureDisabled &&
    !isNoAccount &&
    !isBalanceFetchError &&
    (totalFiatRaw === undefined || totalFiatRaw === '0');

  const isNewUser = isEmpty && !hasSeenMoneyOnboarding;

  const balanceText =
    totalFiatFormatted ?? strings('money.balance_unavailable');

  let buttonVariant: ButtonVariant;
  let buttonLabel: string;
  let buttonTestId: string;
  let containerTestId: string;

  if (isFeatureDisabled || isNoAccount || isError || isRetrying) {
    buttonVariant = ButtonVariant.Secondary;
    buttonLabel = strings('money.balance_card.add');
    buttonTestId = MoneyBalanceCardTestIds.ADD_BUTTON;
    containerTestId = MoneyBalanceCardTestIds.ERROR_CONTAINER;
  } else if (isNewUser) {
    buttonVariant = walletHomeOnboardingFlowVisible
      ? ButtonVariant.Secondary
      : ButtonVariant.Primary;
    buttonLabel = strings(
      walletHomeOnboardingFlowVisible
        ? 'homepage.sections.money_empty_state.get_started'
        : 'homepage.sections.money_empty_state.earn',
    );
    buttonTestId = walletHomeOnboardingFlowVisible
      ? MoneyBalanceCardTestIds.GET_STARTED_BUTTON
      : MoneyBalanceCardTestIds.EARN_BUTTON;
    containerTestId = MoneyBalanceCardTestIds.NEW_USER_CONTAINER;
  } else if (isEmpty) {
    buttonVariant = ButtonVariant.Primary;
    buttonLabel = strings('homepage.sections.money_empty_state.earn');
    buttonTestId = MoneyBalanceCardTestIds.EARN_BUTTON;
    containerTestId = MoneyBalanceCardTestIds.EMPTY_CONTAINER;
  } else {
    buttonVariant = ButtonVariant.Secondary;
    buttonLabel = strings('money.balance_card.add');
    buttonTestId = MoneyBalanceCardTestIds.ADD_BUTTON;
    containerTestId = MoneyBalanceCardTestIds.FUNDED_CONTAINER;
  }

  const handleCardPress = useCallback(() => {
    navigateToMoneyHome();
  }, [navigateToMoneyHome]);

  const handleAddPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  }, [navigation]);

  const handleGetStartedPress = useCallback(() => {
    navigateToMoneyHome();
  }, [navigateToMoneyHome]);

  const handleButtonPress = isNewUser ? handleGetStartedPress : handleAddPress;

  const handleInfoPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MONEY_BALANCE_INFO_SHEET,
    });
  }, [navigation]);

  const renderBalanceSlot = () => {
    if (isFeatureDisabled) {
      return (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          testID={MoneyBalanceCardTestIds.BALANCE_FEATURE_DISABLED}
        >
          {strings('money.balance_feature_disabled')}
        </Text>
      );
    }
    if (isNoAccount) {
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
          {buttonLabel}
        </Button>
      </Box>
    </Pressable>
  );
};

export default MoneyBalanceCard;
