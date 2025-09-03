import {
  TransactionBatchMeta,
  TransactionMeta,
} from '@metamask/transaction-controller';
import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ConfirmationRowComponentIDs } from '../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../../locales/i18n';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../../component-library/components/Texts/Text/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { TOOLTIP_TYPES } from '../../../../../../../core/Analytics/events/confirmations';
import useHideFiatForTestnet from '../../../../../../hooks/useHideFiatForTestnet';
import { useFeeCalculations } from '../../../../hooks/gas/useFeeCalculations';
import { useFeeCalculationsTransactionBatch } from '../../../../hooks/gas/useFeeCalculationsTransactionBatch';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionBatchesMetadata } from '../../../../hooks/transactions/useTransactionBatchesMetadata';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { GasSpeed } from '../../../gas/gas-speed';
import { GasFeeModal } from '../../../modals/gas-fee-modal';
import AlertRow from '../../../UI/info-row/alert-row';
import { RowAlertKey } from '../../../UI/info-row/alert-row/constants';
import InfoSection from '../../../UI/info-row/info-section';
import styleSheet from './gas-fee-details-row.styles';

const EstimationInfo = ({
  hideFiatForTestnet,
  feeCalculations,
  fiatOnly,
}: {
  hideFiatForTestnet: boolean;
  feeCalculations:
    | ReturnType<typeof useFeeCalculations>
    | ReturnType<typeof useFeeCalculationsTransactionBatch>;
  fiatOnly: boolean;
}) => {
  const { styles } = useStyles(styleSheet, {});
  return (
    <View style={styles.estimationContainer}>
      {!hideFiatForTestnet && feeCalculations.estimatedFeeFiat && (
        <Text style={styles.secondaryValue}>
          {feeCalculations.estimatedFeeFiat}
        </Text>
      )}
      {!fiatOnly && (
        <Text style={styles.primaryValue}>
          {feeCalculations.estimatedFeeNative}
        </Text>
      )}
    </View>
  );
};

const SingleEstimateInfo = ({
  hideFiatForTestnet,
  fiatOnly,
}: {
  hideFiatForTestnet: boolean;
  fiatOnly: boolean;
}) => {
  const transactionMetadata = useTransactionMetadataRequest();
  const feeCalculations = useFeeCalculations(
    transactionMetadata as TransactionMeta,
  );

  return (
    <EstimationInfo
      hideFiatForTestnet={hideFiatForTestnet}
      feeCalculations={feeCalculations}
      fiatOnly={fiatOnly}
    />
  );
};

const BatchEstimateInfo = ({
  hideFiatForTestnet,
  fiatOnly,
}: {
  hideFiatForTestnet: boolean;
  fiatOnly: boolean;
}) => {
  const transactionBatchesMetadata = useTransactionBatchesMetadata();
  const feeCalculations = useFeeCalculationsTransactionBatch(
    transactionBatchesMetadata as TransactionBatchMeta,
  );

  return (
    <EstimationInfo
      hideFiatForTestnet={hideFiatForTestnet}
      feeCalculations={feeCalculations}
      fiatOnly={fiatOnly}
    />
  );
};

const ClickableEstimationInfo = ({
  hideFiatForTestnet,
  onPress,
  fiatOnly,
}: {
  hideFiatForTestnet: boolean;
  onPress: () => void;
  fiatOnly: boolean;
}) => {
  const { styles, theme } = useStyles(styleSheet, {});

  const transactionMetadata = useTransactionMetadataRequest();
  const feeCalculations = useFeeCalculations(
    transactionMetadata as TransactionMeta,
  );

  return (
    <TouchableOpacity onPress={onPress} style={styles.editButton}>
      <Icon
        name={IconName.Edit}
        size={IconSize.Md}
        color={theme.colors.info.default}
        style={styles.editIcon}
      />
      <EstimationInfo
        hideFiatForTestnet={hideFiatForTestnet}
        feeCalculations={feeCalculations}
        fiatOnly={fiatOnly}
      />
    </TouchableOpacity>
  );
};

const RenderEstimationInfo = ({
  transactionBatchesMetadata,
  hideFiatForTestnet,
  fiatOnly,
}: {
  transactionBatchesMetadata: TransactionBatchMeta | undefined;
  hideFiatForTestnet: boolean;
  fiatOnly: boolean;
}) => {
  if (transactionBatchesMetadata) {
    return (
      <BatchEstimateInfo
        hideFiatForTestnet={hideFiatForTestnet}
        fiatOnly={fiatOnly}
      />
    );
  }
  return (
    <SingleEstimateInfo
      hideFiatForTestnet={hideFiatForTestnet}
      fiatOnly={fiatOnly}
    />
  );
};

const GasFeesDetailsRow = ({
  disableUpdate = false,
  fiatOnly = false,
  hideSpeed = false,
  noSection = false,
}) => {
  const [gasModalVisible, setGasModalVisible] = useState(false);
  const { styles } = useStyles(styleSheet, {});

  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();

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

  const Container = noSection ? View : InfoSection;

  return (
    <>
      <Container testID={ConfirmationRowComponentIDs.GAS_FEES_DETAILS}>
        <AlertRow
          alertField={RowAlertKey.EstimatedFee}
          label={strings('transactions.network_fee')}
          tooltip={strings('transactions.network_fee_tooltip')}
          onTooltipPress={handleNetworkFeeTooltipClickedEvent}
        >
          <View style={styles.valueContainer}>
            {disableUpdate ? (
              <RenderEstimationInfo
                transactionBatchesMetadata={transactionBatchesMetadata}
                hideFiatForTestnet={hideFiatForTestnet}
                fiatOnly={fiatOnly}
              />
            ) : (
              <ClickableEstimationInfo
                onPress={() => setGasModalVisible(true)}
                hideFiatForTestnet={hideFiatForTestnet}
                fiatOnly={fiatOnly}
              />
            )}
          </View>
        </AlertRow>
        {isUserFeeLevelExists && !hideSpeed && (
          <AlertRow
            alertField={RowAlertKey.PendingTransaction}
            label={strings('transactions.gas_modal.speed')}
          >
            <GasSpeed />
          </AlertRow>
        )}
      </Container>
      {gasModalVisible && (
        <GasFeeModal setGasModalVisible={setGasModalVisible} />
      )}
    </>
  );
};

export default GasFeesDetailsRow;
