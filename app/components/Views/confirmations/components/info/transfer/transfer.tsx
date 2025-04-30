import { TransactionMeta } from '@metamask/transaction-controller';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { SimulationDetails } from '../../../../../UI/SimulationDetails/SimulationDetails';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import useNavbar from '../../../hooks/ui/useNavbar';
import GasFeesDetails from '../../rows/transactions/gas-fee-details';
import TokenHero from '../../rows/transactions/token-hero';
import styleSheet from './transfer.styles';

const Transfer = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});
  const { trackPageViewedEvent } = useConfirmationMetricEvents();

  useNavbar(strings('confirm.review'));

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <View>
      <TokenHero />
      <View style={styles.simulationsDetailsContainer}>
        <SimulationDetails
          transaction={transactionMetadata as TransactionMeta}
          enableMetrics
          isTransactionsRedesign
        />
      </View>
      <GasFeesDetails />
    </View>
  );
};

export default Transfer;
