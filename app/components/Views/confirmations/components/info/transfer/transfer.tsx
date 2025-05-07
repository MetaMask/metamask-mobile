import { TransactionMeta } from '@metamask/transaction-controller';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { SimulationDetails } from '../../../../../UI/SimulationDetails/SimulationDetails';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import useNavbar from '../../../hooks/ui/useNavbar';
import FromTo from '../../rows/transactions/from-to';
import GasFeesDetails from '../../rows/transactions/gas-fee-details';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row/advanced-details-row';
import TokenHero from '../../rows/transactions/token-hero';
import styleSheet from './transfer.styles';

const Transfer = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});
  const { trackPageViewedEvent } = useConfirmationMetricEvents();

  useClearConfirmationOnBackSwipe();
  useNavbar(strings('confirm.review'));

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <View>
      <TokenHero />
      <FromTo />
      <View style={styles.simulationsDetailsContainer}>
        <SimulationDetails
          transaction={transactionMetadata as TransactionMeta}
          enableMetrics
          isTransactionsRedesign
        />
      </View>
      <GasFeesDetails />
      <AdvancedDetailsRow />
    </View>
  );
};

export default Transfer;
