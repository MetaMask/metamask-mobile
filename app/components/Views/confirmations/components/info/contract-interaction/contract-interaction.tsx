import {
  SimulationErrorCode,
  TransactionMeta,
} from '@metamask/transaction-controller';
import React, { useEffect } from 'react';
import { View } from 'react-native';

import { SimulationDetails } from '../../../../../UI/SimulationDetails/SimulationDetails';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { use7702TransactionType } from '../../../hooks/7702/use7702TransactionType';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import AccountNetworkInfoRow from '../../rows/account-network-info-row';
import { NetworkAndOriginRow } from '../../rows/transactions/network-and-origin-row';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row/advanced-details-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import SwitchAccountTypeInfoRow from '../../rows/switch-account-type-info-row';
import ValueRow from '../../rows/transactions/value-row';
import useBalanceChanges from '../../../../../UI/SimulationDetails/useBalanceChanges';

const ContractInteraction = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { trackPageViewedEvent } = useConfirmationMetricEvents();
  const { isBatchedUpgrade } = use7702TransactionType();
  const { simulationData, chainId, networkClientId } =
    transactionMetadata ?? {};
  const balanceChangesResult = useBalanceChanges({
    chainId: chainId ?? '0x0',
    simulationData,
    networkClientId: networkClientId ?? '',
  });
  const loading = !simulationData || balanceChangesResult.pending;

  const shouldShowValueRow =
    !loading && simulationData?.error?.code === SimulationErrorCode.Reverted;

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
      {shouldShowValueRow && <ValueRow />}
      <NetworkAndOriginRow />
      <GasFeesDetailsRow />
      <AdvancedDetailsRow />
    </View>
  );
};

export default ContractInteraction;
