import React, { useCallback, useRef, useEffect } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxFlexWrap,
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
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectMoneyOnboardingSeen } from '../../../../../reducers/user/selectors';
import { selectHasWalletFundingPrimaryCta } from '../../selectors/homePrimaryCta';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
import useMoneyAccountInfo from '../../hooks/useMoneyAccountInfo';
import GlassSurface from '../../../../../component-library/components-temp/GlassSurface';
import ButtonGlass from '../../../../../component-library/components-temp/ButtonGlass';
import { MoneyBalanceCardTestIds } from './MoneyBalanceCard.testIds';
import { useMoneyNavigation } from '../../hooks/useMoneyNavigation';
import {
  BOTTOM_SHEET_NAMES,
  SCREEN_NAMES,
  COMPONENT_NAMES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
} from '../../constants/moneyEvents';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../../selectors/featureFlagController/moneyAccount';
import { selectIsMoneyAccountGeoEligible } from '../../selectors/eligibility';
import { useMoneyAddMoney } from '../../hooks/useMoneyAddMoney';

export interface MoneyBalanceCardProps {
  isGlass?: boolean;
}

const MoneyBalanceCard = ({ isGlass = false }: MoneyBalanceCardProps) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const hasSeenMoneyCardRef = useRef(false);
  const {
    totalFiatRaw,
    totalFiatFormatted,
    isBalanceLoading,
    isBalanceFetchError,
    moneyBalanceQuery,
    refetchBalance,
  } = useMoneyAccountBalance();
  const { apyPercent, vaultApyQuery } = useMoneyVaultApy();
  const { hasMoneyAccount } = useMoneyAccountInfo();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const hasSeenMoneyOnboarding = useSelector(selectMoneyOnboardingSeen);
  const isOnboardingEnabled = useSelector(
    selectMoneyOnboardingStepperAnimationEnabled,
  );
  const hasOtherPrimaryCtaOnHome = useSelector(
    selectHasWalletFundingPrimaryCta,
  );
  const privacyMode = useSelector(selectPrivacyMode);
  const isMoneyAccountGeoEligible = useSelector(
    selectIsMoneyAccountGeoEligible,
  );

  const {
    trackButtonClicked,
    trackSurfaceClicked,
    trackComponentViewed,
    trackTooltipClicked,
  } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.WALLET_HOME,
    component_name: COMPONENT_NAMES.MONEY_BALANCE_CARD,
  });
  const { handleAddPress } = useMoneyAddMoney({
    trackButtonClicked,
  });

  const isBalanceFetching = isBalanceFetchError && moneyBalanceQuery.isFetching;

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
  const hasResolvedNonZeroBalance =
    hasMoneyAccount &&
    !isBalanceLoading &&
    !isBalanceFetchError &&
    totalFiatRaw !== undefined &&
    totalFiatRaw !== '0';
  const shouldRenderCard =
    isMoneyAccountGeoEligible || hasResolvedNonZeroBalance;

  const balanceText = totalFiatFormatted ?? '';

  const buttonLabelKey = 'money.balance_card.add';
  const buttonTestId = MoneyBalanceCardTestIds.ADD_BUTTON;

  let buttonVariant: ButtonVariant;
  let containerTestId: string;

  if (isError || isRetrying) {
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
    if (!shouldRenderCard || hasSeenMoneyCardRef.current) {
      return;
    }
    hasSeenMoneyCardRef.current = true;
    trackComponentViewed();
  }, [shouldRenderCard, trackComponentViewed]);

  const navigateToGeoBlockSheet = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
  }, [navigation]);

  const handleCardPress = useCallback(() => {
    trackSurfaceClicked({
      redirect_target: !isMoneyAccountGeoEligible
        ? BOTTOM_SHEET_NAMES.MONEY_GEO_BLOCK_SHEET
        : hasSeenMoneyOnboarding || !isOnboardingEnabled
          ? SCREEN_NAMES.MONEY_HOME
          : SCREEN_NAMES.MONEY_ONBOARDING,
    });

    if (!isMoneyAccountGeoEligible) {
      navigateToGeoBlockSheet();
      return;
    }

    navigateToMoneyHome();
  }, [
    hasSeenMoneyOnboarding,
    isMoneyAccountGeoEligible,
    isOnboardingEnabled,
    navigateToGeoBlockSheet,
    navigateToMoneyHome,
    trackSurfaceClicked,
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

  if (!shouldRenderCard) {
    return null;
  }

  const renderBalanceSlot = () => {
    if (!hasMoneyAccount || isBalanceLoading || isRetrying) {
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

  const content = (
    <>
      <Box twClassName="w-0 min-w-0 flex-1 gap-1 pr-3">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          flexWrap={BoxFlexWrap.Wrap}
          twClassName="w-full min-w-0"
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            twClassName="max-w-full"
            testID={MoneyBalanceCardTestIds.LABEL}
          >
            {strings('money.balance_card.label')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="shrink-0"
          >
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
              iconProps={{
                color: IconColor.IconAlternative,
                size: IconSize.Sm,
              }}
              size={ButtonIconSize.Sm}
              onPress={handleInfoPress}
              accessibilityLabel={strings(
                'money.balance_card.info_sheet_title',
              )}
              testID={MoneyBalanceCardTestIds.INFO_BUTTON}
            />
          </Box>
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
        twClassName="shrink-0"
      >
        {buttonVariant === ButtonVariant.Secondary ? (
          <ButtonGlass
            isGlass={isGlass}
            testID={buttonTestId}
            size={ButtonSize.Md}
            onPress={handleAddPress}
          >
            {strings(buttonLabelKey)}
          </ButtonGlass>
        ) : (
          <Button
            testID={buttonTestId}
            variant={buttonVariant}
            size={ButtonSize.Md}
            onPress={handleAddPress}
          >
            {strings(buttonLabelKey)}
          </Button>
        )}
      </Box>
    </>
  );

  return (
    <Pressable
      testID={containerTestId}
      onPress={handleCardPress}
      style={({ pressed }) => [
        tw.style('mx-4'),
        !isGlass && pressed && tw.style('opacity-80'),
      ]}
    >
      <GlassSurface
        isGlass={isGlass}
        radiusClassName="rounded-xl"
        isInteractive
        hasSheen
        testID={MoneyBalanceCardTestIds.SURFACE}
        style={tw.style(
          'min-h-[82px] flex-row items-center justify-between gap-3 p-4',
        )}
      >
        {content}
      </GlassSurface>
    </Pressable>
  );
};

export default MoneyBalanceCard;
