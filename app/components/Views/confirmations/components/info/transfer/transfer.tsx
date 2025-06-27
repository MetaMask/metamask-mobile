import { TransactionMeta } from '@metamask/transaction-controller';
import React, { useEffect } from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import { SimulationDetails } from '../../../../../UI/SimulationDetails/SimulationDetails';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import useNavbar from '../../../hooks/ui/useNavbar';
import { useMaxValueRefresher } from '../../../hooks/useMaxValueRefresher';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { useTransferAssetType } from '../../../hooks/useTransferAssetType';
import { HeroRow } from '../../rows/transactions/hero-row';
import { NetworkAndOriginRow } from '../../rows/transactions/network-and-origin-row';
import FromToRow from '../../rows/transactions/from-to-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row';

const Transfer = () => {
  // Set navbar as first to prevent Android navigation flickering
  useNavbar(strings('confirm.review'));
  const transactionMetadata = useTransactionMetadataRequest();
  const { usdValue } = useTokenAmount();
  const { assetType } = useTransferAssetType();
  const { trackPageViewedEvent, setConfirmationMetric } =
    useConfirmationMetricEvents();
  useClearConfirmationOnBackSwipe();
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
    <View testID={ConfirmationInfoComponentIDs.TRANSFER}>
      <HeroRow />
      <FromToRow />
      <NetworkAndOriginRow />
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

export default Transfer;
