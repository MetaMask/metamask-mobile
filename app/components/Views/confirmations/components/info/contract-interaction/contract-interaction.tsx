import { TransactionMeta } from '@metamask/transaction-controller';
import React, { useEffect } from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import { SimulationDetails } from '../../../../../UI/SimulationDetails/SimulationDetails';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { use7702TransactionType } from '../../../hooks/7702/use7702TransactionType';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import AccountNetworkInfo from '../../rows/account-network-info-row';
import OriginRow from '../../rows/origin-row';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row/advanced-details-row';
import GasFeesDetails from '../../rows/transactions/gas-fee-details';
import SwitchAccountTypeInfoRow from '../../rows/switch-account-type-info-row';
import styleSheet from './contract-interaction.styles';

const ContractInteraction = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});

  const { trackPageViewedEvent } = useConfirmationMetricEvents();
  const { isBatchedUpgrade } = use7702TransactionType();

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <View>
      <AccountNetworkInfo />
      {isBatchedUpgrade && <SwitchAccountTypeInfoRow />}
      <View style={styles.simulationsDetailsContainer}>
        <SimulationDetails
          transaction={transactionMetadata as TransactionMeta}
          enableMetrics={false}
          isTransactionsRedesign
        />
      </View>
      <OriginRow isSignatureRequest={false} />
      <GasFeesDetails />
      <AdvancedDetailsRow />
    </View>
  );
};

export default ContractInteraction;
