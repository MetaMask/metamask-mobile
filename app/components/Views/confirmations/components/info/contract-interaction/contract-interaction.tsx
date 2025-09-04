import { TransactionMeta } from '@metamask/transaction-controller';
import React, { useEffect } from 'react';
import { View } from 'react-native';

import { SimulationDetails } from '../../../../../UI/SimulationDetails/SimulationDetails';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { use7702TransactionType } from '../../../hooks/7702/use7702TransactionType';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import AccountNetworkInfoRow from '../../rows/account-network-info-row';
import OriginRow from '../../rows/origin-row';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row/advanced-details-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import SwitchAccountTypeInfoRow from '../../rows/switch-account-type-info-row';

const ContractInteraction = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { trackPageViewedEvent } = useConfirmationMetricEvents();
  const { isBatchedUpgrade } = use7702TransactionType();

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <View testID={ConfirmationInfoComponentIDs.CONTRACT_INTERACTION}>
      <AccountNetworkInfoRow />
      {isBatchedUpgrade && <SwitchAccountTypeInfoRow />}
      <SimulationDetails
        transaction={transactionMetadata as TransactionMeta}
        enableMetrics
        isTransactionsRedesign
      />
      <OriginRow />
      <GasFeesDetailsRow />
      <AdvancedDetailsRow />
    </View>
  );
};

export default ContractInteraction;
