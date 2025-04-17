import { isEIP1559Transaction, TransactionMeta, TransactionParams } from '@metamask/transaction-controller';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks';
import { TOOLTIP_TYPES } from '../../../../../../../core/Analytics/events/confirmations';
import useHideFiatForTestnet from '../../../../../../hooks/useHideFiatForTestnet';
import { useFeeCalculations } from '../../../../hooks/gas/useFeeCalculations';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import InfoSection from '../../../UI/info-row/info-section';
import AlertRow from '../../../UI/info-row/alert-row';
import { RowAlertKey } from '../../../UI/info-row/alert-row/constants';
import styleSheet from './gas-fee-details.styles';
import GasFeeModals from './gas-fee-modals/gas-fee-modals';

const GasFeesDetails = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const isEIP1559 = isEIP1559Transaction(transactionMetadata?.txParams as TransactionParams);
  // TODO: Remove this once we implement the legacy tx modal
  const { styles } = useStyles(styleSheet, { isEIP1559 });
  const feeCalculations = useFeeCalculations(
    transactionMetadata as TransactionMeta,
  );
  const hideFiatForTestnet = useHideFiatForTestnet(
    transactionMetadata?.chainId,
  );
  const { trackTooltipClickedEvent } = useConfirmationMetricEvents();

  const handleNetworkFeeTooltipClickedEvent = () => {
    trackTooltipClickedEvent({
      tooltip: TOOLTIP_TYPES.NETWORK_FEE,
    });
  };

  const [gasModalIsOpen, setGasModalIsOpen] = useState(false);

  if (!transactionMetadata) {
    return null;
  }

  return (
    <TouchableOpacity onPress={() => setGasModalIsOpen(true)}>
      <InfoSection>
        <AlertRow
          alertField={RowAlertKey.EstimatedFee}
          label={strings('transactions.network_fee')}
          tooltip={strings('transactions.network_fee_tooltip')}
          onTooltipPress={handleNetworkFeeTooltipClickedEvent}
        >
          <View style={styles.valueContainer}>
            {!hideFiatForTestnet && feeCalculations.estimatedFeeFiat && (
              <Text style={styles.secondaryValue}>
                {feeCalculations.estimatedFeeFiat}
              </Text>
            )}
            <Text style={styles.primaryValue}>
              {feeCalculations.estimatedFeeNative}
            </Text>
            <GasFeeModals
              gasModalIsOpen={gasModalIsOpen}
              setGasModalIsOpen={setGasModalIsOpen}
            />
          </View>
        </AlertRow>
      </InfoSection>
    </TouchableOpacity>
  );
};

export default GasFeesDetails;
