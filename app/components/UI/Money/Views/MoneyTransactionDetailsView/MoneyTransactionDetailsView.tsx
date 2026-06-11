import React, { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { hasTransactionType } from '../../../../Views/confirmations/utils/transaction';
import { TransactionDetailDivider } from '../../../../Views/confirmations/components/activity/transaction-detail-divider/transaction-detail-divider';
import { TransactionDetailsPaidWithRow } from '../../../../Views/confirmations/components/activity/transaction-details-paid-with-row';
import { TransactionDetailsNetworkFeeRow } from '../../../../Views/confirmations/components/activity/transaction-details-network-fee-row';
import { TransactionDetailsBridgeFeeRow } from '../../../../Views/confirmations/components/activity/transaction-details-bridge-fee-row';
import { TransactionDetailsTotalRow } from '../../../../Views/confirmations/components/activity/transaction-details-total-row';
import { MoneyTransactionDetailsHero } from './MoneyTransactionDetailsHero';
import { MoneyTransactionDetailsStatusRow } from './MoneyTransactionDetailsStatusRow';
import { MoneyTransactionDetailsFromRow } from './MoneyTransactionDetailsFromRow';
import { MoneyTransactionDetailsToRow } from './MoneyTransactionDetailsToRow';
import { MoneyTransactionDetailsOrderIdRow } from './MoneyTransactionDetailsOrderIdRow';
import { MoneyTransactionDetailsSummary } from './MoneyTransactionDetailsSummary';
import { TransactionDetailsDateRow } from '../../../../Views/confirmations/components/activity/transaction-details-date-row';
import styleSheet from './MoneyTransactionDetailsView.styles';

const SEND_TYPES: TransactionType[] = [
  TransactionType.moneyAccountWithdraw,
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

const SUMMARY_SECTION_TYPES: TransactionType[] = [
  TransactionType.musdConversion,
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

function getTitle(transactionMeta: TransactionMeta | undefined): string {
  if (!transactionMeta) {
    return strings('transaction_details.title.default');
  }

  if (hasTransactionType(transactionMeta, SEND_TYPES)) {
    return strings('transaction_details.title.money_sent');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.musdConversion])) {
    return strings('transaction_details.title.money_deposited_musd');
  }

  if (
    hasTransactionType(transactionMeta, [TransactionType.moneyAccountDeposit])
  ) {
    const hasFiatOrder = Boolean(transactionMeta.metamaskPay?.fiat?.orderId);
    if (hasFiatOrder) {
      return strings('transaction_details.title.money_deposit');
    }
    return strings('transaction_details.title.money_deposited_musd');
  }

  return strings('transaction_details.title.default');
}

export default function MoneyTransactionDetailsView() {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { transactionMeta } = useTransactionDetails();
  const title = getTitle(transactionMeta);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const showSummarySection = hasTransactionType(
    transactionMeta,
    SUMMARY_SECTION_TYPES,
  );

  return (
    <View style={styles.wrapper}>
      <HeaderStandard
        title={title}
        onBack={handleBack}
        backButtonProps={{ testID: 'money-transaction-details-back-button' }}
        includesTopInset
      />
      {transactionMeta ? (
        <ScrollView>
          <Box style={styles.container} twClassName="gap-3">
            <MoneyTransactionDetailsHero />
            <MoneyTransactionDetailsStatusRow />
            <TransactionDetailsDateRow />
            <TransactionDetailDivider />
            <MoneyTransactionDetailsFromRow />
            <MoneyTransactionDetailsToRow />
            <MoneyTransactionDetailsOrderIdRow />
            <TransactionDetailsPaidWithRow />
            <TransactionDetailsNetworkFeeRow />
            <TransactionDetailsBridgeFeeRow />
            <TransactionDetailsTotalRow />
            {showSummarySection && (
              <>
                <TransactionDetailDivider />
                <MoneyTransactionDetailsSummary />
              </>
            )}
          </Box>
        </ScrollView>
      ) : null}
    </View>
  );
}
