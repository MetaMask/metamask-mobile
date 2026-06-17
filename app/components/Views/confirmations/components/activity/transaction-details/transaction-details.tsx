import React, { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { Box } from '../../../../../UI/Box/Box';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './transaction-details.styles';
import { TransactionDetailDivider } from '../transaction-detail-divider/transaction-detail-divider';
import { TransactionDetailsDateRow } from '../transaction-details-date-row';
import { TransactionDetailsStatusRow } from '../transaction-details-status-row';
import { useNavigation } from '@react-navigation/native';
import { TransactionDetailsPaidWithRow } from '../transaction-details-paid-with-row';
import { TransactionDetailsSummary } from '../transaction-details-summary';
import { TransactionDetailsHero } from '../transaction-details-hero';
import { TransactionDetailsTotalRow } from '../transaction-details-total-row';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailsNetworkFeeRow } from '../transaction-details-network-fee-row';
import { TransactionDetailsBridgeFeeRow } from '../transaction-details-bridge-fee-row';
import { hasTransactionType } from '../../../utils/transaction';
import { TransactionDetailsRetry } from '../transaction-details-retry';
import { TransactionDetailsAccountRow } from '../transaction-details-account-row';
import { TransactionDetailsToRow } from '../transaction-details-to-row';
import { TransactionDetailsFiatOrderIdRow } from '../transaction-details-fiat-order-id-row';

export const SUMMARY_SECTION_TYPES = [
  TransactionType.musdClaim,
  TransactionType.musdConversion,
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.perpsDeposit,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

const PERPS_PREDICT_MONEY_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

export function TransactionDetails() {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { transactionMeta } = useTransactionDetails();
  const isMoneyContext = useIsMoneyAccountContext();
  const title = getTitle(transactionMeta, isMoneyContext);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const showSummarySection = hasTransactionType(
    transactionMeta,
    SUMMARY_SECTION_TYPES,
  );

  // For perps/predict in money context, To row sits with From row above the divider
  const toRowAboveDivider =
    isMoneyContext &&
    hasTransactionType(transactionMeta, PERPS_PREDICT_MONEY_TYPES);

  return (
    <View style={styles.wrapper}>
      <HeaderStandard
        title={title}
        onBack={handleBack}
        backButtonProps={{ testID: 'transaction-details-back-button' }}
        includesTopInset
      />
      {transactionMeta ? (
        <ScrollView>
          <Box style={styles.container} gap={12}>
            <TransactionDetailsHero />
            {showSummarySection && <TransactionDetailDivider />}
            <TransactionDetailsStatusRow />
            <TransactionDetailsDateRow />
            <TransactionDetailsAccountRow />
            {toRowAboveDivider && <TransactionDetailsToRow />}
            <TransactionDetailDivider />
            {!toRowAboveDivider && <TransactionDetailsToRow />}
            <TransactionDetailsFiatOrderIdRow />
            <TransactionDetailsPaidWithRow />
            <TransactionDetailsNetworkFeeRow />
            <TransactionDetailsBridgeFeeRow />
            <TransactionDetailsTotalRow />
            {showSummarySection && (
              <>
                <TransactionDetailDivider />
                <TransactionDetailsSummary />
                <TransactionDetailsRetry />
              </>
            )}
          </Box>
        </ScrollView>
      ) : null}
    </View>
  );
}

function getTitle(
  transactionMeta: TransactionMeta | undefined,
  isMoneyContext: boolean,
) {
  if (!transactionMeta) {
    return strings('transaction_details.title.default');
  }

  if (
    hasTransactionType(transactionMeta, [TransactionType.moneyAccountDeposit])
  ) {
    if (isMoneyContext) {
      return getConversionTitle(transactionMeta.status);
    }
    return strings('transaction_details.title.money_account_deposit');
  }

  if (
    hasTransactionType(transactionMeta, [TransactionType.moneyAccountWithdraw])
  ) {
    return strings('transaction_details.title.money_account_withdraw');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictClaim])) {
    return strings('transaction_details.title.predict_claim');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    if (isMoneyContext) {
      return getSendTitle(transactionMeta.status);
    }
    return strings('transaction_details.title.predict_deposit');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictWithdraw])) {
    if (isMoneyContext) {
      return strings('transaction_details.title.deposited_musd');
    }
    return strings('transaction_details.title.predict_withdraw');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.perpsWithdraw])) {
    if (isMoneyContext) {
      return strings('transaction_details.title.deposited_musd');
    }
    return strings('transaction_details.title.perps_withdraw');
  }

  switch (transactionMeta.type) {
    case TransactionType.musdConversion:
      if (isMoneyContext) {
        return getConversionTitle(transactionMeta.status);
      }
      return strings('transaction_details.title.musd_conversion');
    case TransactionType.musdClaim:
      return strings('transaction_details.title.musd_claim');
    case TransactionType.perpsDeposit:
      if (isMoneyContext) {
        return getSendTitle(transactionMeta.status);
      }
      return strings('transaction_details.title.perps_deposit');
    default:
      return strings('transaction_details.title.default');
  }
}

function getConversionTitle(status: TransactionStatus): string {
  switch (status) {
    case TransactionStatus.confirmed:
      return strings('transaction_details.title.converted_to_musd');
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return strings('transaction_details.title.conversion_failed');
    default:
      return strings('transaction_details.title.converting_to_musd');
  }
}

function getSendTitle(status: TransactionStatus): string {
  switch (status) {
    case TransactionStatus.confirmed:
      return strings('transaction_details.title.sent');
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return strings('transaction_details.title.send_failed');
    default:
      return strings('transaction_details.title.sending_musd');
  }
}
