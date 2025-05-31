import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TransactionMeta } from '@metamask/transaction-controller';

import Icon, {
  IconSize,
  IconName,
} from '../../../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../../../locales/i18n';
import { TOOLTIP_TYPES } from '../../../../../../../core/Analytics/events/confirmations';
import { useStyles } from '../../../../../../../component-library/hooks';
import useHideFiatForTestnet from '../../../../../../hooks/useHideFiatForTestnet';
import { useFeeCalculations } from '../../../../hooks/gas/useFeeCalculations';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import { GasFeeModal } from '../../../modals/gas-fee-modal';
import InfoSection from '../../../UI/info-row/info-section';
import AlertRow from '../../../UI/info-row/alert-row';
import { RowAlertKey } from '../../../UI/info-row/alert-row/constants';
import { GasSpeed } from '../../../gas/gas-speed';
import styleSheet from './gas-fee-details.styles';

const EstimationInfo = ({
  hideFiatForTestnet,
  feeCalculations,
}: {
  hideFiatForTestnet: boolean;
  feeCalculations: ReturnType<typeof useFeeCalculations>;
}) => {
  const { styles } = useStyles(styleSheet, {});
  return (
    <View style={styles.estimationContainer}>
      {!hideFiatForTestnet && feeCalculations.estimatedFeeFiat && (
        <Text style={styles.secondaryValue}>
          {feeCalculations.estimatedFeeFiat}
        </Text>
      )}
      <Text style={styles.primaryValue}>
        {feeCalculations.estimatedFeeNative}
      </Text>
    </View>
  );
};

const ClickableEstimationInfo = ({
  hideFiatForTestnet,
  feeCalculations,
  onPress,
}: {
  hideFiatForTestnet: boolean;
  feeCalculations: ReturnType<typeof useFeeCalculations>;
  onPress: () => void;
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  return (
    <TouchableOpacity onPress={onPress} style={styles.editButton}>
      <Icon
        name={IconName.Edit}
        size={IconSize.Sm}
        color={theme.colors.info.default}
        style={styles.editIcon}
      />
      <EstimationInfo
        hideFiatForTestnet={hideFiatForTestnet}
        feeCalculations={feeCalculations}
      />
    </TouchableOpacity>
  );
};

const GasFeesDetails = ({ disableUpdate = false }) => {
  const [gasModalVisible, setGasModalVisible] = useState(false);
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const feeCalculations = useFeeCalculations(
    transactionMetadata as TransactionMeta,
  );
  const hideFiatForTestnet = useHideFiatForTestnet(
    transactionMetadata?.chainId,
  );
  const { trackTooltipClickedEvent } = useConfirmationMetricEvents();

  const isUserFeeLevelExists = transactionMetadata?.userFeeLevel;

  const handleNetworkFeeTooltipClickedEvent = () => {
    trackTooltipClickedEvent({
      tooltip: TOOLTIP_TYPES.NETWORK_FEE,
    });
  };

  return (
    <>
      <InfoSection>
        <AlertRow
          alertField={RowAlertKey.EstimatedFee}
          label={strings('transactions.network_fee')}
          tooltip={strings('transactions.network_fee_tooltip')}
          onTooltipPress={handleNetworkFeeTooltipClickedEvent}
        >
          <View style={styles.valueContainer}>
            {disableUpdate ? (
              <EstimationInfo
                hideFiatForTestnet={hideFiatForTestnet}
                feeCalculations={feeCalculations}
              />
            ) : (
              <ClickableEstimationInfo
                onPress={() => setGasModalVisible(true)}
                hideFiatForTestnet={hideFiatForTestnet}
                feeCalculations={feeCalculations}
              />
            )}
          </View>
        </AlertRow>
        {isUserFeeLevelExists && (
          <AlertRow
            alertField={RowAlertKey.PendingTransaction}
            label={strings('transactions.gas_modal.speed')}
          >
            <GasSpeed />
          </AlertRow>
        )}
      </InfoSection>
      {gasModalVisible && (
        <GasFeeModal setGasModalVisible={setGasModalVisible} />
      )}
    </>
  );
};

export default GasFeesDetails;
