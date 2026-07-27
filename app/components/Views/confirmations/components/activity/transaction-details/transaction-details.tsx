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
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailsFeeSection } from '../transaction-details-fee-section';
import { hasTransactionType } from '../../../utils/transaction';
import { TransactionDetailsRetry } from '../transaction-details-retry';
import { TransactionDetailsAccountRow } from '../transaction-details-account-row';
import { TransactionDetailsToRow } from '../transaction-details-to-row';
import { TransactionDetailsFiatOrderIdRow } from '../transaction-details-fiat-order-id-row';
import {
  classifyMoneyActivity,
  getMoneyActivityStatus,
  moneyActivityLabel,
} from '../../../../../UI/Money/utils/classifyMoneyActivity';

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
            <TransactionDetailDivider />
            <TransactionDetailsToRow />
            <TransactionDetailsFiatOrderIdRow />
            <TransactionDetailsPaidWithRow />
            <TransactionDetailsFeeSection />
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

  // In the Money account context the details header must read identically to
  // the activity-list row that opened it. Both derive the title from the same
  // classifier, so they can never drift out of sync.
  if (isMoneyContext) {
    return moneyActivityLabel(
      classifyMoneyActivity(transactionMeta),
      getMoneyActivityStatus(transactionMeta),
    );
  }

  if (
    hasTransactionType(transactionMeta, [TransactionType.moneyAccountDeposit])
  ) {
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
    return strings('transaction_details.title.predict_deposit');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictWithdraw])) {
    return strings('transaction_details.title.predict_withdraw');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.perpsWithdraw])) {
    return strings('transaction_details.title.perps_withdraw');
  }

  switch (transactionMeta.type) {
    case TransactionType.musdConversion:
      return strings('transaction_details.title.musd_conversion');
    case TransactionType.musdClaim:
      return strings('transaction_details.title.musd_claim');
    case TransactionType.perpsDeposit:
      return strings('transaction_details.title.perps_deposit');
    default:
      return strings('transaction_details.title.default');
  }
}
