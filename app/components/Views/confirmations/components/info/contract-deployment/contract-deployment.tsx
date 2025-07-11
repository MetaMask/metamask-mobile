import { TransactionMeta } from '@metamask/transaction-controller';
import React, { useEffect } from 'react';
import { View } from 'react-native';

import { SimulationDetails } from '../../../../../UI/SimulationDetails/SimulationDetails';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import AccountNetworkInfoRow from '../../rows/account-network-info-row';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row/advanced-details-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';

const ContractDeployment = () => {
  const transactionMetadata = useTransactionMetadataRequest();

  const { trackPageViewedEvent } = useConfirmationMetricEvents();

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <View testID={ConfirmationInfoComponentIDs.CONTRACT_DEPLOYMENT}>
      <AccountNetworkInfoRow />
      <SimulationDetails
        transaction={transactionMetadata as TransactionMeta}
        enableMetrics
        isTransactionsRedesign
      />
      <GasFeesDetailsRow />
      <AdvancedDetailsRow />
    </View>
  );
};

export default ContractDeployment;
