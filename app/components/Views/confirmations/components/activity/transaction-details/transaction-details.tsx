import React, { useEffect } from 'react';
import ScreenView from '../../../../../Base/ScreenView';
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
import { TransactionDetailsHero } from '../transaction-details-hero/transaction-details-hero';
import { TransactionDetailsTotalRow } from '../transaction-details-total-row';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailsNetworkFeeRow } from '../transaction-details-network-fee-row';
import { TransactionDetailsBridgeFeeRow } from '../transaction-details-bridge-fee-row';

export function TransactionDetails() {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const theme = useTheme();
  const { transactionMeta } = useTransactionDetails();

  const { colors } = theme;
  const title = getTitle(transactionMeta.type);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(title, navigation, true, colors),
    );
  }, [colors, navigation, theme, title]);

  return (
    <ScreenView>
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
      </Box>
    </ScreenView>
  );
}

function getTitle(type?: TransactionType) {
  switch (type) {
    case TransactionType.perpsDeposit:
      return strings('transaction_details.title.perps_deposit');
    default:
      return strings('transaction_details.title.default');
  }
}
