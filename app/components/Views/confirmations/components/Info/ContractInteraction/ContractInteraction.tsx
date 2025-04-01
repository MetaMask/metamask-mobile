import { TransactionMeta } from '@metamask/transaction-controller';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import { SimulationDetails } from '../../../../../UI/SimulationDetails/SimulationDetails';
import { useConfirmationMetricEvents } from '../../../hooks/useConfirmationMetricEvents';
import { useTransactionMetadataRequest } from '../../../hooks/useTransactionMetadataRequest';
import AccountNetworkInfo from '../../Confirm/AccountNetworkInfo';
import GasFeesDetails from '../../Confirm/Info/GasFeesDetails';
import InfoRowOrigin from '../../Confirm/Info/Shared/InfoRowOrigin';
import styleSheet from './ContractInteraction.styles';

const ContractInteraction = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});

  const { trackPageViewedEvent } = useConfirmationMetricEvents();

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <View>
      <AccountNetworkInfo isSignatureRequest={false} />
      <View style={styles.simulationsDetailsContainer}>
        <SimulationDetails
          transaction={transactionMetadata as TransactionMeta}
          enableMetrics={false}
          isTransactionsRedesign
        />
      </View>
      <InfoRowOrigin isSignatureRequest={false} />
      <GasFeesDetails />
    </View>
  );
};

export default ContractInteraction;
