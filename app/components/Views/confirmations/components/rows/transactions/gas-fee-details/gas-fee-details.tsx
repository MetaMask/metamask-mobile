import { isEIP1559Transaction, TransactionMeta, TransactionParams, TransactionType } from '@metamask/transaction-controller';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks';
import { TOOLTIP_TYPES } from '../../../../../../../core/Analytics/events/confirmations';
import useHideFiatForTestnet from '../../../../../../hooks/useHideFiatForTestnet';
import { useFeeCalculations } from '../../../../hooks/gas/useFeeCalculations';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import AlertRow from '../../../UI/info-row/alert-row';
import { RowAlertKey } from '../../../UI/info-row/alert-row/constants';
import InfoSection from '../../../UI/info-row/info-section';
import styleSheet from './gas-fee-details.styles';
import GasFeeModals from '../../../modals/gas-fee-modals/gas-fee-modals';
import { useSupportsEIP1559 } from '../../../../hooks/transactions/useSupportsEIP1559';
const GasFeesDetails = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { supportsEIP1559 } = useSupportsEIP1559(transactionMetadata as TransactionMeta);
  const { styles } = useStyles(styleSheet, { isEIP1559: supportsEIP1559 });
  const feeCalculations = useFeeCalculations(
    transactionMetadata as TransactionMeta,
  );
  const hideFiatForTestnet = useHideFiatForTestnet(
    transactionMetadata?.chainId,
  );
  const { trackTooltipClickedEvent } = useConfirmationMetricEvents();
  const [gasModalIsOpen, setGasModalIsOpen] = useState(false);

  const handleNetworkFeeTooltipClickedEvent = () => {
    trackTooltipClickedEvent({
      tooltip: TOOLTIP_TYPES.NETWORK_FEE,
    });
  };

  if (!transactionMetadata) {
    return null;
  }

  const isConfirmationWithGasFeeModals = [
    TransactionType.contractInteraction,
  ].includes(transactionMetadata.type as TransactionType);

  const InfoSectionComponent = (
    <InfoSection>
        <AlertRow
          alertField={RowAlertKey.EstimatedFee}
          label={strings('transactions.network_fee')}
          tooltip={strings('transactions.network_fee_tooltip')}
          onTooltipPress={handleNetworkFeeTooltipClickedEvent}
        >
          <View style={styles.valueContainer}>
            {!hideFiatForTestnet && feeCalculations?.estimatedFeeFiat && (
              <Text style={styles.secondaryValue}>
                {feeCalculations.estimatedFeeFiat}
              </Text>
            )}
            <Text style={styles.primaryValue}>
              {feeCalculations?.estimatedFeeNative}
            </Text>
            <GasFeeModals
              gasModalIsOpen={gasModalIsOpen}
              setGasModalIsOpen={setGasModalIsOpen}
            />
          </View>
        </AlertRow>
      </InfoSection>
  )

  return isConfirmationWithGasFeeModals ? (
    <TouchableOpacity onPress={() => setGasModalIsOpen(true)}>
      {InfoSectionComponent}
    </TouchableOpacity>
  ) : (
    InfoSectionComponent
  );
};

export default GasFeesDetails;
