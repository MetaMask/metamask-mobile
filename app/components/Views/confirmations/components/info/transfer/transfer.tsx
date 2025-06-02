import { TransactionMeta } from '@metamask/transaction-controller';
import React, { useEffect } from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import { SimulationDetails } from '../../../../../UI/SimulationDetails/SimulationDetails';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import useNavbar from '../../../hooks/ui/useNavbar';
import { MMM_ORIGIN } from '../../../constants/confirmations';
import { useMaxValueRefresher } from '../../../hooks/useMaxValueRefresher';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { useTransferAssetType } from '../../../hooks/useTransferAssetType';
import FromTo from '../../rows/transactions/from-to';
import GasFeesDetails from '../../rows/transactions/gas-fee-details';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row/advanced-details-row';
import TokenHero from '../../rows/transactions/token-hero';
import NetworkRow from '../../rows/transactions/network-row';

const Transfer = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const isDappTransfer = transactionMetadata?.origin !== MMM_ORIGIN;
  const { usdValue } = useTokenAmount();
  const { assetType } = useTransferAssetType();
  const { trackPageViewedEvent, setConfirmationMetric } =
    useConfirmationMetricEvents();

  useClearConfirmationOnBackSwipe();
  useNavbar(strings('confirm.review'));
  useMaxValueRefresher();
  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  useEffect(() => {
    setConfirmationMetric({
      properties: {
        transaction_transfer_usd_value: usdValue,
        asset_type: assetType,
      },
    });
  }, [assetType, usdValue, setConfirmationMetric]);

  return (
    <View>
      <TokenHero />
      <FromTo />
      <NetworkRow />
      {isDappTransfer && (
        <SimulationDetails
          transaction={transactionMetadata as TransactionMeta}
          enableMetrics
          isTransactionsRedesign
        />
      )}
      <GasFeesDetails />
      <AdvancedDetailsRow />
    </View>
  );
};

export default Transfer;
