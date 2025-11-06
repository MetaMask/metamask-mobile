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
import { SelectedGasFeeToken } from '../../../gas/selected-gas-fee-token';
import { useSelectedGasFeeToken } from '../../../../hooks/gas/useGasFeeToken';
import {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { GasFeeTokenToast } from '../../../gas/gas-fee-token-toast';
import { useAutomaticGasFeeTokenSelect } from '../../../../hooks/useAutomaticGasFeeTokenSelect';

const PaidByMetaMask = () => (
  <Text variant={TextVariant.BodyMD} testID="paid-by-metamask">
    {strings('transactions.paid_by_metamask')}
  </Text>
);
const EstimationInfo = ({
  hideFiatForTestnet,
  feeCalculations,
  fiatOnly,
  isGasFeeSponsored,
}: {
  hideFiatForTestnet: boolean;
  feeCalculations:
    | ReturnType<typeof useFeeCalculations>
    | ReturnType<typeof useFeeCalculationsTransactionBatch>;
  fiatOnly: boolean;
  isGasFeeSponsored?: boolean;
}) => {
  const gasFeeToken = useSelectedGasFeeToken();
  const { styles } = useStyles(styleSheet, {});

  const fiatValue = gasFeeToken?.amountFiat ?? feeCalculations.estimatedFeeFiat;
  const nativeValue = feeCalculations.estimatedFeeNative;

  const displayValue =
    hideFiatForTestnet || !fiatValue ? nativeValue : fiatValue;
  const displayStyle =
    hideFiatForTestnet || !fiatValue
      ? styles.primaryValue
      : styles.secondaryValue;

  return (
    <View style={styles.estimationContainer}>
      {isGasFeeSponsored ? (
        <PaidByMetaMask />
      ) : (
        <>
          {displayValue && <Text style={displayStyle}>{displayValue}</Text>}
          {!fiatOnly && <SelectedGasFeeToken />}
        </>
      )}
    </View>
  );
};

const SingleEstimateInfo = ({
  hideFiatForTestnet,
  fiatOnly,
  isGasFeeSponsored,
}: {
  hideFiatForTestnet: boolean;
  fiatOnly: boolean;
  isGasFeeSponsored?: boolean;
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
      isGasFeeSponsored={isGasFeeSponsored}
    />
  );
};

const BatchEstimateInfo = ({
  hideFiatForTestnet,
  fiatOnly,
  isGasFeeSponsored,
}: {
  hideFiatForTestnet: boolean;
  fiatOnly: boolean;
  isGasFeeSponsored?: boolean;
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
      isGasFeeSponsored={isGasFeeSponsored}
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
  isGasFeeSponsored,
}: {
  transactionBatchesMetadata: TransactionBatchMeta | undefined;
  hideFiatForTestnet: boolean;
  fiatOnly: boolean;
  isGasFeeSponsored?: boolean;
}) => {
  if (transactionBatchesMetadata) {
    return (
      <BatchEstimateInfo
        hideFiatForTestnet={hideFiatForTestnet}
        fiatOnly={fiatOnly}
        isGasFeeSponsored={isGasFeeSponsored}
      />
    );
  }
  return (
    <SingleEstimateInfo
      hideFiatForTestnet={hideFiatForTestnet}
      fiatOnly={fiatOnly}
      isGasFeeSponsored={isGasFeeSponsored}
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
  useAutomaticGasFeeTokenSelect();

  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();
  const gasFeeToken = useSelectedGasFeeToken();
  const metamaskFeeFiat = gasFeeToken?.metamaskFeeFiat;

  const hideFiatForTestnet = useHideFiatForTestnet(
    transactionMetadata?.chainId,
  );
  const { trackTooltipClickedEvent } = useConfirmationMetricEvents();

  const isUserFeeLevelExists = transactionMetadata?.userFeeLevel;
  const isGasFeeSponsored = transactionMetadata?.isGasFeeSponsored;

  const handleNetworkFeeTooltipClickedEvent = () => {
    trackTooltipClickedEvent({
      tooltip: TOOLTIP_TYPES.NETWORK_FEE,
    });
  };

  const confirmGasFeeTokenTooltip = gasFeeToken
    ? strings('transactions.confirm_gas_fee_token_tooltip', {
        metamaskFeeFiat,
      })
    : strings('transactions.network_fee_tooltip');

  const Container = noSection ? View : InfoSection;
  return (
    <>
      <Container testID={ConfirmationRowComponentIDs.GAS_FEES_DETAILS}>
        <AlertRow
          alertField={RowAlertKey.EstimatedFee}
          label={strings('transactions.network_fee')}
          tooltip={confirmGasFeeTokenTooltip}
          onTooltipPress={handleNetworkFeeTooltipClickedEvent}
        >
          <View style={styles.valueContainer}>
            {disableUpdate || gasFeeToken || isGasFeeSponsored ? (
              <RenderEstimationInfo
                transactionBatchesMetadata={transactionBatchesMetadata}
                hideFiatForTestnet={hideFiatForTestnet}
                fiatOnly={fiatOnly}
                isGasFeeSponsored={isGasFeeSponsored}
              />
            ) : (
              <ClickableEstimationInfo
                onPress={() => setGasModalVisible(true)}
                hideFiatForTestnet={hideFiatForTestnet}
                fiatOnly={fiatOnly}
              />
            )}
          </View>
          {gasFeeToken && (
            <View style={styles.gasFeeTokenContainer}>
              <Text
                data-testid="gas-fee-token-fee"
                variant={TextVariant.BodySM}
                color={TextColor.Alternative}
                style={styles.gasFeeTokenText}
              >
                {gasFeeToken
                  ? strings('transactions.confirm_gas_fee_token_metamask_fee', {
                      metamaskFeeFiat,
                    })
                  : ' '}
              </Text>
            </View>
          )}
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
      <GasFeeTokenToast />
    </>
  );
};

export default GasFeesDetailsRow;
