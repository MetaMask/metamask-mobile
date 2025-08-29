import React, { useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { MMM_ORIGIN } from '../../../constants/confirmations';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionBatchesMetadata } from '../../../hooks/transactions/useTransactionBatchesMetadata';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import useNavbar from '../../../hooks/ui/useNavbar';
import AccountNetworkInfo from '../../rows/account-network-info-row';
import OriginRow from '../../rows/origin-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';

const TransactionBatch = () => {
  useNavbar(strings('confirm.transaction'), true);
  useClearConfirmationOnBackSwipe();
  const { trackPageViewedEvent } = useConfirmationMetricEvents();

  const transactionBatchesMetadata = useTransactionBatchesMetadata();

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  const isWalletInitiated = transactionBatchesMetadata?.origin === MMM_ORIGIN;

  return (
    <View>
      <AccountNetworkInfo />
      {!isWalletInitiated && <OriginRow />}
      <GasFeesDetailsRow disableUpdate />
    </View>
  );
};

export default TransactionBatch;
