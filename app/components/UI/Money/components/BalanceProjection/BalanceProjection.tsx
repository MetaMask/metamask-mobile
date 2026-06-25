import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useFiatFormatter from '../../../SimulationDetails/FiatDisplay/useFiatFormatter';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { isPositiveNumberOrZero } from '../../utils/number';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
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
  const navigation = useNavigation();
  const { vaultApyQuery, apyDecimal, apyPercent } = useMoneyAccountBalance();
  const formatFiat = useFiatFormatter();
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

  const handleApyInfoPress = useCallback(() => {
    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.APY,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
      params: { apy: apyPercent, variant: 'deposit' },
    });
  }, [trackTooltipClicked, navigation, apyPercent]);

  const handleEarnCryptoInfoPress = useCallback(() => {
    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.EARN_ON_YOUR_CRYPTO,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARN_CRYPTO_INFO_SHEET,
      params: { variant: 'deposit' },
    });
  }, [navigation, trackTooltipClicked]);

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

  if (amount.isGreaterThan(0) && projected !== null) {
    return (
      <View testID="balance-projection">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-0.5"
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('confirm.custom_amount.projected_balance', {
              projectedYears,
            })}{' '}
            <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
              {formatFiat(projected)}
            </Text>
          </Text>
          <ButtonIcon
            iconName={IconName.Info}
            iconProps={{ color: IconColor.IconAlternative, size: IconSize.Sm }}
            size={ButtonIconSize.Sm}
            onPress={handleEarnCryptoInfoPress}
            accessibilityLabel={strings(
              'money.earn_crypto_info_sheet.deposit_title',
            )}
            testID="balance-projection-info-button"
          />
        </Box>
      </View>
    );
  }

  return (
    <View testID="balance-projection-apy-pitch">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-0.5"
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('confirm.custom_amount.earn_up_to_apy', {
            percentage: apyPercent,
          })}
        </Text>
        <ButtonIcon
          iconName={IconName.Info}
          iconProps={{ color: IconColor.IconAlternative, size: IconSize.Sm }}
          size={ButtonIconSize.Sm}
          onPress={handleApyInfoPress}
          accessibilityLabel={strings('money.apy_info_label')}
          testID="balance-projection-apy-pitch-info-button"
        />
      </Box>
    </View>
  );
}
