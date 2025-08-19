/* eslint-disable react/no-unstable-nested-components */
import React, { useEffect } from 'react';
import ScreenView from '../../../../../Base/ScreenView';
import { Box } from '../../../../../UI/Box/Box';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './transaction-details.styles';
import { TransactionDetailDivider } from '../transaction-detail-divider/transaction-detail-divider';
import { TransactionDetailsDateRow } from '../transaction-details-date-row/transaction-details-date-row';
import { TransactionDetailsStatusRow } from '../transaction-details-status-row/transaction-details-status-row';
import { useNavigation } from '@react-navigation/native';
import { getNavigationOptionsTitle } from '../../../../../UI/Navbar';
import { useTheme } from '../../../../../../util/theme';
import { TransactionDetailsPayWithRow } from '../transaction-details-pay-with-row/transaction-details-pay-with-row';
import { TransactionDetailsSummary } from '../transaction-details-summary/transaction-details-summary';
import { TransactionDetailsHero } from '../transaction-details-hero/transaction-details-hero';

export function TransactionDetails() {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        'Funded perps account',
        navigation,
        true,
        colors,
      ),
    );
  }, [colors, navigation, theme]);

  return (
    <ScreenView>
      <Box style={styles.container} gap={12}>
        <TransactionDetailsHero />
        <TransactionDetailsStatusRow />
        <TransactionDetailsDateRow />
        <TransactionDetailDivider />
        <TransactionDetailsPayWithRow />
        <TransactionDetailsPayWithRow />
        <TransactionDetailsPayWithRow />
        <TransactionDetailsPayWithRow />
        <TransactionDetailDivider />
        <TransactionDetailsSummary />
      </Box>
    </ScreenView>
  );
}
