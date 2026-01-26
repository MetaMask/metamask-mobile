import {
  TransactionBatchMeta,
  TransactionMeta,
} from '@metamask/transaction-controller';
import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';
import { strings } from '../../../../../../../../locales/i18n';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import Text from '../../../../../../../component-library/components/Texts/Text/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { TOOLTIP_TYPES } from '../../../../../../../core/Analytics/events/confirmations';
import useHideFiatForTestnet from '../../../../../../hooks/useHideFiatForTestnet';
import useBalanceChanges from '../../../../../../UI/SimulationDetails/useBalanceChanges';
import { useFeeCalculations } from '../../../../hooks/gas/useFeeCalculations';
import { useFeeCalculationsTransactionBatch } from '../../../../hooks/gas/useFeeCalculationsTransactionBatch';
import { useSelectedGasFeeToken } from '../../../../hooks/gas/useGasFeeToken';
import { useIsGaslessSupported } from '../../../../hooks/gas/useIsGaslessSupported';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionBatchesMetadata } from '../../../../hooks/transactions/useTransactionBatchesMetadata';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { useAutomaticGasFeeTokenSelect } from '../../../../hooks/useAutomaticGasFeeTokenSelect';
import { GasFeeTokenToast } from '../../../gas/gas-fee-token-toast';
import { GasSpeed } from '../../../gas/gas-speed';
import { SelectedGasFeeToken } from '../../../gas/selected-gas-fee-token';
import { GasFeeModal } from '../../../modals/gas-fee-modal';
import AlertRow from '../../../UI/info-row/alert-row';
import { RowAlertKey } from '../../../UI/info-row/alert-row/constants';
import InfoSection from '../../../UI/info-row/info-section';
import { Skeleton } from '../../../../../../../component-library/components/Skeleton';
import styleSheet from './gas-fee-details-row.styles';
import { IconColor } from '../../../../../../../component-library/components/Icons/Icon/Icon.types';
import { selectNetworkConfigurationByChainId } from '../../../../../../../selectors/networkController';
import type { RootState } from '../../../../../../../reducers';
import useNetworkInfo from '../../../../hooks/useNetworkInfo';

const PaidByMetaMask = () => (
  <Text variant={TextVariant.BodyMD} testID="paid-by-metamask">
    {strings('transactions.paid_by_metamask')}
  </Text>
);

const SkeletonEstimationInfo = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Skeleton width={140} height={20} style={styles.skeletonBorderRadius} />
  );
};

const EstimationInfo = ({
  hideFiatForTestnet,
  feeCalculations,
  fiatOnly,
  isGasFeeSponsored,
  isBatch = false,
}: {
  hideFiatForTestnet: boolean;
  feeCalculations:
    | ReturnType<typeof useFeeCalculations>
    | ReturnType<typeof useFeeCalculationsTransactionBatch>;
  fiatOnly: boolean;
  isGasFeeSponsored?: boolean;
  isBatch?: boolean;
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

  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId, simulationData, networkClientId } =
    (transactionMetadata as TransactionMeta) ?? {};
  const balanceChangesResult = useBalanceChanges({
    chainId,
    simulationData,
    networkClientId,
  });

  const isSimulationLoading =
    !isBatch && (!simulationData || balanceChangesResult.pending);

  return (
    <View style={styles.estimationContainer}>
      {isGasFeeSponsored ? (
        <PaidByMetaMask />
      ) : isSimulationLoading ? (
        <SkeletonEstimationInfo />
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
  const isBatch = Boolean(transactionBatchesMetadata);

  return (
    <EstimationInfo
      hideFiatForTestnet={hideFiatForTestnet}
      feeCalculations={feeCalculations}
      fiatOnly={fiatOnly}
      isGasFeeSponsored={isGasFeeSponsored}
      isBatch={isBatch}
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
  const {
    userFeeLevel: isUserFeeLevelExists,
    isGasFeeSponsored: doesSentinelAllowSponsorship,
  } = transactionMetadata ?? {};

  const hideFiatForTestnet = useHideFiatForTestnet(
    transactionMetadata?.chainId,
  );
  const { trackTooltipClickedEvent } = useConfirmationMetricEvents();

  // This prevents the gas fee row from showing as sponsored if stx is disabled
  // by the user and 7702 is not supported in the chain.
  const { isSupported: isGaslessSupported } = useIsGaslessSupported();
  const isGasFeeSponsored = isGaslessSupported && doesSentinelAllowSponsorship;

  const handleNetworkFeeTooltipClickedEvent = () => {
    trackTooltipClickedEvent({
      tooltip: TOOLTIP_TYPES.NETWORK_FEE,
    });
  };

  const networkConfiguration = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, transactionMetadata?.chainId),
  );
  const { nativeCurrency } = networkConfiguration ?? {};

  const { networkNativeCurrency } = useNetworkInfo(
    transactionMetadata?.chainId,
  );

  // Fallback chain: networkConfiguration.nativeCurrency -> networkNativeCurrency -> empty string
  const nativeTokenSymbol = nativeCurrency ?? networkNativeCurrency ?? '';

  const showGasFeeTokenInfo =
    gasFeeToken?.metaMaskFee && gasFeeToken?.metaMaskFee !== '0x0';

  const confirmGasFeeTokenTooltip = isGasFeeSponsored
    ? strings('bridge.network_fee_info_content_sponsored', {
        nativeToken: nativeTokenSymbol,
      })
    : showGasFeeTokenInfo
      ? strings('transactions.confirm_gas_fee_token_tooltip', {
          metamaskFeeFiat,
        })
      : strings('transactions.network_fee_tooltip');

  const Container = noSection ? View : InfoSection;

  const { chainId, simulationData, networkClientId } =
    (transactionMetadata as TransactionMeta) ?? {};
  const balanceChangesResult = useBalanceChanges({
    chainId,
    simulationData,
    networkClientId,
  });
  const isSimulationLoading = !simulationData || balanceChangesResult.pending;
  return (
    <>
      <Container testID={ConfirmationRowComponentIDs.GAS_FEES_DETAILS}>
        <AlertRow
          alertField={RowAlertKey.EstimatedFee}
          label={strings('transactions.network_fee')}
          tooltip={confirmGasFeeTokenTooltip}
          tooltipColor={IconColor.Alternative}
          onTooltipPress={handleNetworkFeeTooltipClickedEvent}
        >
          <View style={styles.valueContainer}>
            {disableUpdate ||
            gasFeeToken ||
            isGasFeeSponsored ||
            isSimulationLoading ? (
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
                {showGasFeeTokenInfo
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

export function GasFeesDetailsRowSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <InfoSection>
      <View style={styles.skeletonRowContainer}>
        <Skeleton width={105} height={20} style={styles.skeletonBorderRadius} />
        <Skeleton width={140} height={20} style={styles.skeletonBorderRadius} />
      </View>
      <View style={styles.skeletonRowContainer}>
        <Skeleton width={50} height={20} style={styles.skeletonBorderRadius} />
        <Skeleton width={140} height={20} style={styles.skeletonBorderRadius} />
      </View>
    </InfoSection>
  );
}

export default GasFeesDetailsRow;
