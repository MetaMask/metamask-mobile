import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { PaymentOverride } from '@metamask/transaction-pay-controller';

import { strings } from '../../../../../../../locales/i18n';
import { RootState } from '../../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../../selectors/transactionPayController';
import { PerpsBalanceAvatar } from '../../../components/perps-confirmations/perps-balance-avatar';
import {
  PayWithRowConfig,
  PayWithSectionConfig,
} from '../../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { PayWithBottomSheetIDs } from '../../../ConfirmationView.testIds';
import { getPerpsBalanceAssetId } from '../../../utils/perps-balance-asset';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import {
  usePerpsTransferBalance,
  usePerpsTransferSource,
  usePerpsTransferTarget,
} from '../usePerpsTransferTarget';
import { useTransactionPayToken } from '../useTransactionPayToken';
import { useClearPaymentOverride } from './useClearPaymentOverride';

export const PAY_WITH_PERPS_ACCOUNT_SECTION_TEST_ID =
  PayWithBottomSheetIDs.PERPS_ACCOUNT_SECTION;
export const PAY_WITH_PERPS_ACCOUNT_ROW_TEST_ID =
  PayWithBottomSheetIDs.PERPS_ACCOUNT_ROW;

/**
 * The other Perps account, so the funds move from one provider to the other:
 * the "To" option of a Perps withdraw, or a "Pay with" option of a Perps
 * deposit. Returns null outside a Perps deposit or withdraw.
 */
export function usePayWithPerpsAccountSection(): PayWithSectionConfig | null {
  const navigation = useNavigation<AppNavigationProp>();
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const withdrawTarget = usePerpsTransferTarget();
  const depositSource = usePerpsTransferSource();
  const target = withdrawTarget ?? depositSource;
  const balance = usePerpsTransferBalance(target);
  const { payToken, setPayToken } = useTransactionPayToken();
  const clearPaymentOverride = useClearPaymentOverride();
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const isMoneyAccountSelected =
    paymentOverride === PaymentOverride.MoneyAccount;

  const assetId = target ? getPerpsBalanceAssetId(target) : undefined;
  const isSelected =
    Boolean(assetId) &&
    payToken?.assetId === assetId &&
    !isMoneyAccountSelected;

  const handleSelect = useCallback(() => {
    if (!assetId) {
      return;
    }

    clearPaymentOverride();
    setPayToken({ assetId });
    navigation.goBack();
  }, [assetId, clearPaymentOverride, navigation, setPayToken]);

  return useMemo(() => {
    if (!target) {
      return null;
    }

    const row: PayWithRowConfig = {
      id: `perps-account-${target}`,
      icon: <PerpsBalanceAvatar provider={target} />,
      title: strings(`confirm.perps_withdraw_from.${target}`),
      subtitle: strings('confirm.pay_with_bottom_sheet.available_balance', {
        balance,
      }),
      isSelected,
      trailingElement: isSelected ? 'checkmark' : 'none',
      onPress: handleSelect,
      testID: PAY_WITH_PERPS_ACCOUNT_ROW_TEST_ID,
    };

    return {
      id: 'perps-account',
      title: strings('confirm.pay_with_bottom_sheet.perps'),
      testID: PAY_WITH_PERPS_ACCOUNT_SECTION_TEST_ID,
      rows: [row],
    };
  }, [balance, handleSelect, isSelected, target]);
}
