import { TransactionMeta } from '@metamask/transaction-controller';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import { SimulationDetails } from '../../../../../UI/SimulationDetails/SimulationDetails';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import AccountNetworkInfo from '../../rows/account-network-info-row';
import GasFeesDetails from '../../rows/transactions/gas-fee-details';
import OriginRow from '../../rows/origin-row';
import styleSheet from './contract-interaction.styles';

const ContractInteraction = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});

  const { trackPageViewedEvent } = useConfirmationMetricEvents();

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <View>
      <AccountNetworkInfo />
      <View style={styles.simulationsDetailsContainer}>
        <SimulationDetails
          transaction={transactionMetadata as TransactionMeta}
          enableMetrics={false}
          isTransactionsRedesign
        />
      </View>
      <OriginRow isSignatureRequest={false} />
      <GasFeesDetails />
    </View>
  );
};

export default ContractInteraction;
