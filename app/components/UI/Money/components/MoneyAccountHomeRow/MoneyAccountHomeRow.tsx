import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { useCashNavigation } from '../../../../Views/Homepage/Sections/Cash/useCashNavigation';
import { MoneyAccountHomeRowTestIds } from './MoneyAccountHomeRow.testIds';

const MoneyAccountHomeRow = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { navigateToCash } = useCashNavigation();
  const {
    totalFiatRaw,
    totalFiatFormatted,
    apyPercent,
    isAggregatedBalanceLoading,
    vaultApyQuery,
  } = useMoneyAccountBalance();

  const isEmpty = totalFiatRaw === undefined || totalFiatRaw === '0';

  const apyLabel = isEmpty
    ? strings('homepage.sections.cash_empty_state.earn_apy', {
        percentage: apyPercent,
      })
    : strings('homepage.sections.cash_filled_state.apy', {
        percentage: apyPercent,
      });

  const handleGetStartedPress = useCallback(() => {
    navigateToCash();
  }, [navigateToCash]);

  const handleAddPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  }, [navigation]);

  return (
    <Pressable
      testID={
        isEmpty
          ? MoneyAccountHomeRowTestIds.EMPTY_CONTAINER
          : MoneyAccountHomeRowTestIds.FUNDED_CONTAINER
      }
      onPress={navigateToCash}
      style={({ pressed }) =>
        tw.style(
          'flex-row items-center justify-between py-1',
          pressed && 'opacity-80',
        )
      }
    >
      <Pressable
        onPress={navigateToCash}
        style={tw.style('flex-row items-center gap-5 flex-1')}
      >
        <AvatarToken
          name={MUSD_TOKEN.symbol}
          src={MUSD_TOKEN.imageSource as number}
          size={AvatarTokenSize.Lg}
        />
        <Box twClassName="flex-1 gap-1">
          {isAggregatedBalanceLoading ? (
            <Skeleton
              height={24}
              width={100}
              testID={MoneyAccountHomeRowTestIds.BALANCE_SKELETON}
            />
          ) : (
            <Text
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Medium}
              testID={MoneyAccountHomeRowTestIds.BALANCE}
            >
              {totalFiatFormatted}
            </Text>
          )}
          {vaultApyQuery.isLoading ? (
            <Skeleton
              height={20}
              width={80}
              twClassName="rounded-md"
              testID={MoneyAccountHomeRowTestIds.APY_TAG_SKELETON}
            />
          ) : (
            <Box
              twClassName="self-start rounded-md bg-success-muted px-2 py-0.5"
              testID={MoneyAccountHomeRowTestIds.APY_TAG}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
              >
                {apyLabel}
              </Text>
            </Box>
          )}
        </Box>
      </Pressable>

      {isEmpty ? (
        <Button
          testID={MoneyAccountHomeRowTestIds.GET_STARTED_BUTTON}
          variant={ButtonVariant.Primary}
          size={ButtonSize.Md}
          onPress={handleGetStartedPress}
        >
          {strings('homepage.sections.cash_empty_state.get_started')}
        </Button>
      ) : (
        <Button
          testID={MoneyAccountHomeRowTestIds.ADD_BUTTON}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          onPress={handleAddPress}
        >
          {strings('homepage.sections.cash_filled_state.add')}
        </Button>
      )}
    </Pressable>
  );
};

export default MoneyAccountHomeRow;
