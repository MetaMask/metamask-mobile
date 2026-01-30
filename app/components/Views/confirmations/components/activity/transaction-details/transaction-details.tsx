import React, { useEffect } from 'react';
import { Box } from '../../../../../UI/Box/Box';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './transaction-details.styles';
import { TransactionDetailDivider } from '../transaction-detail-divider/transaction-detail-divider';
import { TransactionDetailsDateRow } from '../transaction-details-date-row';
import { TransactionDetailsStatusRow } from '../transaction-details-status-row';
import { useNavigation } from '@react-navigation/native';
import { getNavigationOptionsTitle } from '../../../../../UI/Navbar';
import { useTheme } from '../../../../../../util/theme';
import { TransactionDetailsPaidWithRow } from '../transaction-details-paid-with-row';
import { TransactionDetailsSummary } from '../transaction-details-summary';
import { TransactionDetailsHero } from '../transaction-details-hero';
import { TransactionDetailsTotalRow } from '../transaction-details-total-row';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailsNetworkFeeRow } from '../transaction-details-network-fee-row';
import { TransactionDetailsBridgeFeeRow } from '../transaction-details-bridge-fee-row';
import { hasTransactionType } from '../../../utils/transaction';
import { ScrollView } from 'react-native';
import { TransactionDetailsRetry } from '../transaction-details-retry';
import { TransactionDetailsAccountRow } from '../transaction-details-account-row';

export const SUMMARY_SECTION_TYPES = [
  TransactionType.musdConversion,
  TransactionType.musdClaim,
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

export function TransactionDetails() {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const theme = useTheme();
  const { transactionMeta } = useTransactionDetails();

  const { colors } = theme;
  const title = getTitle(transactionMeta);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(title, navigation, true, colors),
    );
  }, [colors, navigation, theme, title]);

  const showSummarySection = hasTransactionType(
    transactionMeta,
    SUMMARY_SECTION_TYPES,
  );

  return (
    <ScrollView>
      <Box style={styles.container} gap={12}>
        <TransactionDetailsHero />
        <TransactionDetailsStatusRow />
        <TransactionDetailsDateRow />
        <TransactionDetailsAccountRow />
        <TransactionDetailDivider />
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
  );
}

function getTitle(transactionMeta: TransactionMeta) {
  if (hasTransactionType(transactionMeta, [TransactionType.predictClaim])) {
    return strings('transaction_details.title.predict_claim');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    return strings('transaction_details.title.predict_deposit');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictWithdraw])) {
    return strings('transaction_details.title.predict_withdraw');
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
