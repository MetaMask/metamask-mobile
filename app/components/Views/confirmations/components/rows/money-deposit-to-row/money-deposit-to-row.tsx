import React, { memo, useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontFamily,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import MoneyBalanceIcon from '../../../../../../images/money-balance.svg';
import Routes from '../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { useTheme } from '../../../../../../util/theme';
import DottedUnderline from '../../../../../UI/DottedUnderline';
import useMoneyVaultApy from '../../../../../UI/Money/hooks/useMoneyVaultApy';
import { useMoneyAnalytics } from '../../../../../UI/Money/hooks/useMoneyAnalytics';
import { isPositiveNumberOrZero } from '../../../../../UI/Money/utils/number';
import {
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  SCREEN_NAMES,
} from '../../../../../UI/Money/constants/moneyEvents';
import InfoRow, { InfoRowVariant } from '../../UI/info-row/info-row';
import { MoneyDepositApySheet } from '../../modals/money-apy-info-sheet';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

export const MoneyDepositToRowIDs = {
  ROW: ConfirmationRowComponentIDs.MONEY_DEPOSIT_TO,
  MONEY_PRESSABLE: 'money-deposit-to-money-pressable',
  APY_PRESSABLE: 'money-deposit-to-apy-pressable',
} as const;

function MoneyDepositToRowComponent() {
  const transactionMeta = useTransactionMetadataRequest();
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { colors } = useTheme();
  const { apyPercent } = useMoneyVaultApy({ enabled: isMoneyAccountDeposit });
  const { trackTooltipClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_DEPOSIT,
  });
  const [isApySheetOpen, setIsApySheetOpen] = useState(false);

  const handleMoneyPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.SPLASH);
  }, [navigation]);

  const handleApyPress = useCallback(() => {
    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.APY,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });

    setIsApySheetOpen(true);
  }, [trackTooltipClicked]);

  const handleApyClose = useCallback(() => {
    setIsApySheetOpen(false);
  }, []);

  if (!isMoneyAccountDeposit) {
    return null;
  }

  const hasApy = isPositiveNumberOrZero(apyPercent);
  const moneyLabel = strings('confirm.money_deposit.to_metamask_money');
  const apyLabel = hasApy
    ? strings('confirm.money_deposit.apy_label', { percentage: apyPercent })
    : undefined;

  return (
    <>
      <InfoRow
        testID={MoneyDepositToRowIDs.ROW}
        label={strings('confirm.label.to')}
        rowVariant={InfoRowVariant.Small}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <MoneyBalanceIcon
            width={24}
            height={24}
            name="money-balance"
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
          >
            <Pressable
              onPress={handleMoneyPress}
              accessibilityRole="button"
              accessibilityLabel={moneyLabel}
              hitSlop={8}
              style={({ pressed }) =>
                tw.style('pb-px', pressed && 'opacity-50')
              }
              testID={MoneyDepositToRowIDs.MONEY_PRESSABLE}
            >
              <DottedUnderline color={colors.text.default}>
                <Text
                  variant={TextVariant.BodyMd}
                  fontFamily={FontFamily.Default}
                  fontWeight={FontWeight.Regular}
                  color={TextColor.TextDefault}
                >
                  {moneyLabel}
                </Text>
              </DottedUnderline>
            </Pressable>
            {apyLabel ? (
              <>
                <Text
                  variant={TextVariant.BodyMd}
                  fontFamily={FontFamily.Default}
                  fontWeight={FontWeight.Regular}
                  color={TextColor.TextAlternative}
                >
                  {strings('confirm.money_deposit.to_separator')}
                </Text>
                <Pressable
                  onPress={handleApyPress}
                  accessibilityRole="button"
                  accessibilityLabel={apyLabel}
                  hitSlop={8}
                  style={({ pressed }) =>
                    tw.style('pb-px', pressed && 'opacity-50')
                  }
                  testID={MoneyDepositToRowIDs.APY_PRESSABLE}
                >
                  <DottedUnderline color={colors.success.default}>
                    <Text
                      variant={TextVariant.BodyMd}
                      fontFamily={FontFamily.Default}
                      fontWeight={FontWeight.Regular}
                      color={TextColor.SuccessDefault}
                    >
                      {apyLabel}
                    </Text>
                  </DottedUnderline>
                </Pressable>
              </>
            ) : null}
          </Box>
        </Box>
      </InfoRow>
      {isApySheetOpen ? (
        <MoneyDepositApySheet
          open={isApySheetOpen}
          onClose={handleApyClose}
          apy={apyPercent}
        />
      ) : null}
    </>
  );
}

export const MoneyDepositToRow = memo(MoneyDepositToRowComponent);
