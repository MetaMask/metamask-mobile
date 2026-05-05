import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../component-library/hooks';
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

  const isEmpty = totalFiatRaw === undefined || totalFiatRaw === '0';

  let balanceText: string;
  let containerTestId: string;
  if (isEmpty) {
    balanceText = EMPTY_BALANCE_DISPLAY;
    containerTestId = MoneyBalanceCardTestIds.EMPTY_CONTAINER;
  } else {
    balanceText = totalFiatFormatted ?? EMPTY_BALANCE_DISPLAY;
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
          twClassName="gap-1"
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
            iconProps={{ color: IconColor.IconDefault }}
            size={ButtonIconSize.Sm}
            onPress={handleInfoPress}
            accessibilityLabel={strings('money.balance_card.info_sheet_title')}
            testID={MoneyBalanceCardTestIds.INFO_BUTTON}
          />
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
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
              twClassName="rounded-md"
              testID={MoneyBalanceCardTestIds.APY_TAG_SKELETON}
            />
          ) : (
            <Box
              twClassName="self-center rounded-md bg-success-muted px-2 py-0.5"
              testID={MoneyBalanceCardTestIds.APY_TAG}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
              >
                {strings('money.apy_label', { percentage: apyPercent ?? 0 })}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.End}
      >
        <Button
          testID={MoneyBalanceCardTestIds.ADD_BUTTON}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          onPress={handleAddPress}
        >
          {strings('money.balance_card.add')}
        </Button>
      </Box>
    </Pressable>
  );
};

export default MoneyBalanceCard;
