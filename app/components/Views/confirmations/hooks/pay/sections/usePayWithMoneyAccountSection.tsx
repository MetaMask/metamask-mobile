import React, { useCallback, useMemo } from 'react';
import { Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import MoneyIcon from '../../../../../../images/money.png';
import { RootState } from '../../../../../../reducers';
import { selectPrimaryMoneyAccount } from '../../../../../../selectors/moneyAccountController';
import {
  selectMetaMaskPayFlags,
  selectPerpsMoneyAccountNoFeeRouteEnabled,
} from '../../../../../../selectors/featureFlagController/confirmations';
import {
  selectPaymentOverrideByTransactionId,
  selectTransactionPaymentTokenByTransactionId,
} from '../../../../../../selectors/transactionPayController';
import useMoneyAccountBalance from '../../../../../UI/Money/hooks/useMoneyAccountBalance';
import useMoneyVaultApy from '../../../../../UI/Money/hooks/useMoneyVaultApy';
import { NoDepositFeeTag } from '../../../components/UI/no-fee-tag';
import { ApyTag } from '../../../components/UI/apy-tag';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import { getTransactionType } from '../../../utils/transaction';
import {
  applyMoneyAccountOverride,
  isMoneyAccountFunding,
} from '../../../utils/transaction-pay';
import { usePayMoneyAccountAvailable } from '../usePayMoneyAccountAvailable';
import {
  PayWithRowConfig,
  PayWithSectionConfig,
} from '../../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { PayWithBottomSheetIDs } from '../../../ConfirmationView.testIds';

export const PAY_WITH_MONEY_ACCOUNT_SECTION_TEST_ID =
  PayWithBottomSheetIDs.MONEY_ACCOUNT_SECTION;
export const PAY_WITH_MONEY_ACCOUNT_ROW_TEST_ID =
  PayWithBottomSheetIDs.MONEY_ACCOUNT_ROW;

const styles = StyleSheet.create({
  moneyIcon: { width: 24, height: 24 },
});

export function usePayWithMoneyAccountSection(): PayWithSectionConfig | null {
  const navigation = useNavigation<AppNavigationProp>();
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const { enableMoneyAccountTransactions } = useSelector(
    selectMetaMaskPayFlags,
  );
  const isPerpsMoneyAccountNoFeeRouteEnabled = useSelector(
    selectPerpsMoneyAccountNoFeeRouteEnabled,
  );
  const { withdrawableFiatFormatted } = useMoneyAccountBalance();
  const { isAvailable: isMoneyAccountAvailable } =
    usePayMoneyAccountAvailable();

  // Perps and Predict withdraws only. Those flows pay *into* the Money account,
  // so the vault rate is what the user earns on the funds they are about to
  // receive. Every other flow spends from the account, where the rate is not a
  // property of the payment, so the tag must never show there.
  const isApyTagTransactionType = hasTransactionType(transactionMeta, [
    TransactionType.perpsWithdraw,
    TransactionType.predictWithdraw,
  ]);

  // Skip the vault APY request entirely on the flows that cannot render the tag.
  const { apyPercent } = useMoneyVaultApy({
    enabled: isApyTagTransactionType,
  });
  const showApyTag = isApyTagTransactionType && apyPercent !== undefined;

  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const payToken = useSelector((state: RootState) =>
    selectTransactionPaymentTokenByTransactionId(state, transactionId),
  );
  // A Money Account deposit funded from Solana keeps the override for its
  // second leg, but the Solana source is what is selected.
  const isMoneyAccountSelected = isMoneyAccountFunding({
    paymentOverride,
    payToken,
    transactionMeta,
  });

  const transactionType = getTransactionType(transactionMeta);
  const isEnabled = Boolean(
    transactionType && enableMoneyAccountTransactions[transactionType],
  );
  // Perps deposits only. Predict deposits are not subsidised, so they must
  // never show the tag. The gate is the Monad mUSD -> Hyperliquid fixed-spread
  // route in `confirmations_relay_fixed_spread`.
  const showNoDepositFeeTag =
    isPerpsMoneyAccountNoFeeRouteEnabled &&
    hasTransactionType(transactionMeta, [
      TransactionType.perpsDeposit,
      TransactionType.perpsDepositAndOrder,
    ]);

  const handlePress = useCallback(() => {
    if (transactionId) {
      applyMoneyAccountOverride(
        transactionId,
        moneyAccount?.address,
        transactionMeta,
      );
    }
    navigation.goBack();
  }, [moneyAccount?.address, navigation, transactionId, transactionMeta]);

  return useMemo(() => {
    if (!isEnabled || !isMoneyAccountAvailable) {
      return null;
    }

    const subtitle = withdrawableFiatFormatted
      ? strings('confirm.pay_with_bottom_sheet.available_balance', {
          balance: withdrawableFiatFormatted,
        })
      : undefined;

    const row: PayWithRowConfig = {
      id: 'money-account-musd',
      icon: React.createElement(Image, {
        source: MoneyIcon,
        style: styles.moneyIcon,
      }),
      title: strings('confirm.pay_with_bottom_sheet.money_account'),
      subtitle,
      isSelected: isMoneyAccountSelected,
      ...(showNoDepositFeeTag || showApyTag
        ? {
            tagRenderers: [
              ...(showApyTag
                ? [
                    () => (
                      <ApyTag
                        apyPercent={apyPercent}
                        testID={`${PAY_WITH_MONEY_ACCOUNT_ROW_TEST_ID}-apy-tag`}
                      />
                    ),
                  ]
                : []),
              ...(showNoDepositFeeTag
                ? [
                    () => (
                      <NoDepositFeeTag
                        testID={`${PAY_WITH_MONEY_ACCOUNT_ROW_TEST_ID}-no-fee-tag`}
                      />
                    ),
                  ]
                : []),
            ],
          }
        : {}),
      trailingElement: isMoneyAccountSelected ? 'checkmark' : 'none',
      onPress: handlePress,
      testID: PAY_WITH_MONEY_ACCOUNT_ROW_TEST_ID,
    };

    return {
      id: 'money-account',
      title: '',
      testID: PAY_WITH_MONEY_ACCOUNT_SECTION_TEST_ID,
      rows: [row],
    };
  }, [
    handlePress,
    isEnabled,
    isMoneyAccountAvailable,
    isMoneyAccountSelected,
    showApyTag,
    showNoDepositFeeTag,
    withdrawableFiatFormatted,
    apyPercent,
  ]);
}
