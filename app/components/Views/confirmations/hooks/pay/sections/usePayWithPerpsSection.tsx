import React, { useCallback, useMemo, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { BigNumber } from 'bignumber.js';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { RootState } from '../../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../../selectors/transactionPayController';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { selectPerpsAccountState } from '../../../../../UI/Perps/selectors/perpsController';
import { useIsPerpsBalanceSelected } from '../../../../../UI/Perps/hooks/useIsPerpsBalanceSelected';
import { usePerpsPaymentToken } from '../../../../../UI/Perps/hooks/usePerpsPaymentToken';
import { usePerpsTrading } from '../../../../../UI/Perps/hooks/usePerpsTrading';
import { markPerpsPaymentTokenSelection } from '../../../../../UI/Perps/utils/perpsPaymentTokenSelection';
import useApprovalRequest from '../../useApprovalRequest';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import {
  PayWithRowConfig,
  PayWithSectionConfig,
} from '../../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { useClearPaymentOverride } from './useClearPaymentOverride';
import { PayWithBottomSheetIDs } from '../../../ConfirmationView.testIds';

export const PAY_WITH_PERPS_SECTION_TEST_ID =
  PayWithBottomSheetIDs.PERPS_SECTION;
export const PAY_WITH_PERPS_BALANCE_ROW_TEST_ID =
  PayWithBottomSheetIDs.PERPS_BALANCE_ROW;

export function usePayWithPerpsSection(): PayWithSectionConfig | null {
  const navigation = useNavigation<AppNavigationProp>();
  const transactionMeta = useTransactionMetadataRequest();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const perpsAccount = useSelector(selectPerpsAccountState);
  const { onPaymentTokenChange } = usePerpsPaymentToken();
  const isPerpsBalanceSelected = useIsPerpsBalanceSelected();
  const { depositWithConfirmation, depositWithOrder } = usePerpsTrading();
  const { onReject } = useApprovalRequest();
  const hasLeftForDeposit = useRef(false);
  const isRestoringOrder = useRef(false);
  const transactionId = transactionMeta?.id ?? '';
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const isMoneyAccountSelected =
    paymentOverride === PaymentOverride.MoneyAccount;

  const isPerpsDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.perpsDepositAndOrder,
  ]);

  const balance = useMemo(
    () => formatFiat(new BigNumber(perpsAccount?.spendableBalance ?? '0')),
    [formatFiat, perpsAccount?.spendableBalance],
  );

  const clearPaymentOverride = useClearPaymentOverride();

  const handleSelect = useCallback(() => {
    // an explicit row press is a selection even when it does not
    // change the pay token (e.g. re-selecting the already-selected balance).
    markPerpsPaymentTokenSelection();
    onPaymentTokenChange(null);
    clearPaymentOverride();
    navigation.goBack();
  }, [clearPaymentOverride, navigation, onPaymentTokenChange]);

  const restoreOrder = useCallback(() => {
    if (isRestoringOrder.current) {
      return;
    }

    isRestoringOrder.current = true;

    depositWithOrder()
      .then(() => {
        hasLeftForDeposit.current = false;
      })
      .catch(() => undefined)
      .finally(() => {
        isRestoringOrder.current = false;
      });
  }, [depositWithOrder]);

  const handleAdd = useCallback(async () => {
    onReject();
    try {
      await depositWithConfirmation();
      hasLeftForDeposit.current = true;
      navigation.navigate(
        Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        { showPerpsHeader: true },
      );
    } catch {
      hasLeftForDeposit.current = true;
      restoreOrder();
    }
  }, [depositWithConfirmation, navigation, onReject, restoreOrder]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLeftForDeposit.current || transactionMeta) {
        return;
      }

      restoreOrder();
    }, [restoreOrder, transactionMeta]),
  );

  return useMemo(() => {
    if (!isPerpsDepositAndOrder) {
      return null;
    }

    const row: PayWithRowConfig = {
      id: 'perps-balance',
      icon: React.createElement(Icon, {
        name: IconName.Candlestick,
        size: IconSize.Md,
        color: IconColor.IconAlternative,
      }),
      title: strings('confirm.pay_with_bottom_sheet.perps_balance'),
      subtitle: strings('confirm.pay_with_bottom_sheet.available_balance', {
        balance,
      }),
      isSelected: isPerpsBalanceSelected && !isMoneyAccountSelected,
      trailingElement: (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          onPress={handleAdd}
        >
          {strings('confirm.pay_with_bottom_sheet.add')}
        </Button>
      ),
      onPress: handleSelect,
      testID: PAY_WITH_PERPS_BALANCE_ROW_TEST_ID,
    };

    return {
      id: 'perps',
      title: strings('confirm.pay_with_bottom_sheet.perps'),
      testID: PAY_WITH_PERPS_SECTION_TEST_ID,
      rows: [row],
    };
  }, [
    balance,
    handleAdd,
    handleSelect,
    isPerpsBalanceSelected,
    isPerpsDepositAndOrder,
    isMoneyAccountSelected,
  ]);
}
