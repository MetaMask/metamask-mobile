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

  return (
    <ScrollView>
      <Box style={styles.container} gap={12}>
        <TransactionDetailsHero />
        <TransactionDetailsStatusRow />
        <TransactionDetailsDateRow />
        <TransactionDetailDivider />
        <TransactionDetailsPaidWithRow />
        <TransactionDetailsNetworkFeeRow />
        <TransactionDetailsBridgeFeeRow />
        <TransactionDetailsTotalRow />
        <TransactionDetailDivider />
        <TransactionDetailsSummary />
        <TransactionDetailsRetry />
      </Box>
    </ScrollView>
  );
}

function getTitle(transactionMeta: TransactionMeta) {
  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    return strings('transaction_details.title.predict_deposit');
  }

  switch (transactionMeta.type) {
    case TransactionType.perpsDeposit:
      return strings('transaction_details.title.perps_deposit');
    default:
      return strings('transaction_details.title.default');
  }
}
