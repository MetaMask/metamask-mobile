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
import { selectMusdConversionEducationSeen } from '../../../../../reducers/user/selectors';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import styleSheet from './MoneyBalanceCard.styles';
import { MoneyBalanceCardTestIds } from './MoneyBalanceCard.testIds';

const EMPTY_BALANCE_DISPLAY = '$0.00';

const MoneyBalanceCard = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const {
    totalFiatRaw,
    totalFiatFormatted,
    apyPercent,
    isAggregatedBalanceLoading,
    vaultApyQuery,
  } = useMoneyAccountBalance();
  const hasSeenOnboarding = useSelector(selectMusdConversionEducationSeen);

  const isEmpty = totalFiatRaw === undefined || totalFiatRaw === '0';
  const isNewUser = isEmpty && !hasSeenOnboarding;

  let balanceText: string;
  let buttonVariant: ButtonVariant;
  let buttonLabel: string;
  let buttonTestId: string;
  let containerTestId: string;
  if (isNewUser) {
    balanceText = EMPTY_BALANCE_DISPLAY;
    buttonVariant = ButtonVariant.Primary;
    buttonLabel = strings('homepage.sections.money_empty_state.get_started');
    buttonTestId = MoneyBalanceCardTestIds.GET_STARTED_BUTTON;
    containerTestId = MoneyBalanceCardTestIds.NEW_USER_CONTAINER;
  } else if (isEmpty) {
    balanceText = EMPTY_BALANCE_DISPLAY;
    buttonVariant = ButtonVariant.Primary;
    buttonLabel = strings('money.balance_card.add');
    buttonTestId = MoneyBalanceCardTestIds.ADD_BUTTON;
    containerTestId = MoneyBalanceCardTestIds.EMPTY_CONTAINER;
  } else {
    balanceText = totalFiatFormatted ?? EMPTY_BALANCE_DISPLAY;
    buttonVariant = ButtonVariant.Secondary;
    buttonLabel = strings('money.balance_card.add');
    buttonTestId = MoneyBalanceCardTestIds.ADD_BUTTON;
    containerTestId = MoneyBalanceCardTestIds.FUNDED_CONTAINER;
  }

  const handleCardPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.ROOT, {
      screen: Routes.MONEY.HOME,
    });
  }, [navigation]);

  const handleAddPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  }, [navigation]);

  const handleGetStartedPress = useCallback(() => {
    navigation.navigate(Routes.EARN.ROOT, {
      screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
      params: {
        returnTo: {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
      },
    });
  }, [navigation]);

  const handleButtonPress = isNewUser ? handleGetStartedPress : handleAddPress;

  const handleInfoPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MONEY_BALANCE_INFO_SHEET,
    });
  }, [navigation]);

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
          {isAggregatedBalanceLoading ? (
            <Skeleton
              height={24}
              width={100}
              testID={MoneyBalanceCardTestIds.BALANCE_SKELETON}
            />
          ) : (
            <Text
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              testID={MoneyBalanceCardTestIds.BALANCE}
            >
              {balanceText}
            </Text>
          )}
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
