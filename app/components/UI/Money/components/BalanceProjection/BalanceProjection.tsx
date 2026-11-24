import React, { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import BigNumber from 'bignumber.js';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import DottedUnderline from '../../../DottedUnderline';
import { useTheme } from '../../../../../util/theme';
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { isPositiveNumberOrZero } from '../../utils/number';
import { moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import Routes from '../../../../../constants/navigation/Routes';

export interface BalanceProjectionProps {
  amountFiat: string;
  projectedYears: number;
}

export function BalanceProjection({
  amountFiat,
  projectedYears,
}: BalanceProjectionProps) {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { colors } = useTheme();
  const { vaultApyQuery, apyDecimal, apyPercent } = useMoneyVaultApy();
  const { trackTooltipClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_DEPOSIT,
  });

  const amount = useMemo(() => {
    const value = new BigNumber(amountFiat || '0');
    return value.isFinite() ? value : null;
  }, [amountFiat]);

  const projected = useMemo(() => {
    if (amount === null || !isPositiveNumberOrZero(apyDecimal)) {
      return null;
    }

    return amount.multipliedBy(
      new BigNumber(1).plus(apyDecimal).pow(projectedYears),
    );
  }, [amount, apyDecimal, projectedYears]);

  const projectedFormatted = useMemo(
    () => (projected !== null ? moneyFormatUsd(projected) : null),
    [projected],
  );

  const handleApyInfoPress = useCallback(() => {
    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.APY,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
      params: { apy: apyPercent },
    });
  }, [trackTooltipClicked, navigation, apyPercent]);

  const handleEstimatedBalancePress = useCallback(() => {
    if (amount === null || projectedFormatted === null) {
      return;
    }

    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.ESTIMATED_BALANCE,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
      component_name: COMPONENT_NAMES.MONEY_BALANCE_PROJECTION,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ESTIMATED_BALANCE_SHEET,
      params: {
        depositAmountFiat: moneyFormatUsd(amount),
        projectedAmountFiat: projectedFormatted,
        apy: apyPercent,
      },
    });
  }, [amount, apyPercent, navigation, projectedFormatted, trackTooltipClicked]);

  if (vaultApyQuery.isLoading) {
    return (
      <View testID="balance-projection-skeleton">
        <Skeleton height={20} width={160} />
      </View>
    );
  }

  if (
    amount === null ||
    !isPositiveNumberOrZero(apyDecimal) ||
    !isPositiveNumberOrZero(apyPercent)
  ) {
    return null;
  }

  if (amount.isGreaterThan(0) && projectedFormatted !== null) {
    const labelText = strings('confirm.custom_amount.projected_balance', {
      projectedYears,
    });

    return (
      <View testID="balance-projection">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="shrink"
          >
            {`${labelText} `}
          </Text>
          <Pressable
            onPress={handleEstimatedBalancePress}
            accessibilityRole="button"
            accessibilityLabel={`${labelText} ${projectedFormatted}`}
            hitSlop={8}
            style={({ pressed }) => tw.style('pb-px', pressed && 'opacity-50')}
            testID="balance-projection-value-pressable"
          >
            <DottedUnderline color={colors.success.default}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
              >
                {projectedFormatted}
              </Text>
            </DottedUnderline>
          </Pressable>
        </Box>
      </View>
    );
  }

  return (
    <View testID="balance-projection-apy-pitch">
      <Pressable
        onPress={handleApyInfoPress}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => tw.style('pb-px', pressed && 'opacity-50')}
        testID="balance-projection-apy-pitch-pressable"
      >
        <DottedUnderline color={colors.text.alternative}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('confirm.custom_amount.earn_up_to_apy', {
              percentage: apyPercent,
            })}
          </Text>
        </DottedUnderline>
      </Pressable>
    </View>
  );
}
