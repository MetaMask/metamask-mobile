import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import {
  isEIP1559Transaction,
  type FeeMarketEIP1559Values,
  type GasPriceValue,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonsAlignment } from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.types';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import { Box } from '../../../../../../components/UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
} from '../../../../../../components/UI/Box/box.types';
import { GasFeeModalTransactionProvider } from '../../../context/gas-fee-modal-transaction';
import {
  getBumpParamsForCancelSpeedup,
  useCancelSpeedupGas,
} from '../../../hooks/gas/useCancelSpeedupGas';
import {
  updatePreviousGasParams,
  updateTransactionGasFees,
} from '../../../../../../util/transaction-controller';
import { useGasFeeEstimates } from '../../../hooks/gas/useGasFeeEstimates';
import { GasFeeModal } from '../gas-fee-modal';
import { GasSpeed } from '../../gas/gas-speed';
import NetworkAssetLogo from '../../../../../UI/NetworkAssetLogo';
import InfoSection from '../../UI/info-row/info-section';
import InfoRow from '../../UI/info-row/info-row';
import styleSheet from './cancel-speedup-modal.styles';
import { useStyles } from '../../../../../hooks/useStyles';

const NetworkFeeRow = ({
  fiat,
  native,
  symbol,
  chainId,
  onEditPress,
}: {
  fiat: string | null;
  native: string;
  symbol: string;
  chainId: Hex;
  onEditPress?: () => void;
}) => {
  const tw = useTailwind();
  const content = (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={3}
      style={tw.style('flex-wrap')}
    >
      {onEditPress && (
        <Icon
          name={IconName.Edit}
          size={IconSize.Md}
          color={IconColor.InfoDefault}
          twClassName="mr-1"
          testID="cancel-speedup-edit-gas"
        />
      )}
      {fiat ? (
        <Text variant={TextVariant.BodyMd}>{fiat}</Text>
      ) : (
        <Text variant={TextVariant.BodyMd}>{native}</Text>
      )}
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={3}
      >
        <NetworkAssetLogo
          chainId={chainId}
          ticker={symbol}
          big={false}
          biggest={false}
          style={tw.style('rounded-full w-5 h-5')}
          testID="cancel-speedup-network-fee-logo"
        />
        <Text variant={TextVariant.BodyMd}>{symbol}</Text>
      </Box>
    </Box>
  );

  return (
    <InfoRow label={strings('transactions.network_fee')}>
      {onEditPress ? (
        <Pressable
          onPress={onEditPress}
          accessibilityRole="button"
          accessibilityLabel={strings(
            'transactions.gas_modal.edit_network_fee',
          )}
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
    </InfoRow>
  );
};

const SpeedRow = ({ transactionId }: { transactionId?: string }) => (
  <InfoRow label={strings('transactions.gas_modal.speed')}>
    <GasSpeed transactionId={transactionId} />
  </InfoRow>
);

const Description = ({ text }: { text: string }) => (
  <Text
    variant={TextVariant.BodySm}
    color={TextColor.TextAlternative}
    twClassName="mt-2 pb-3"
  >
    {text}
  </Text>
);

export interface CancelSpeedupModalProps {
  isVisible: boolean;
  isCancel: boolean;
  tx: TransactionMeta | null;
  onConfirm: (
    params: GasPriceValue | FeeMarketEIP1559Values | undefined,
  ) => void;
  onClose: () => void;
  confirmDisabled?: boolean;
}

const modalStyle = StyleSheet.create({
  bottom: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});

export function CancelSpeedupModal({
  isVisible,
  isCancel,
  tx,
  onConfirm,
  onClose,
  confirmDisabled = false,
}: CancelSpeedupModalProps) {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const tw = useTailwind();
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const [gasModalVisible, setGasModalVisible] = useState(false);

  const { gasFeeEstimates } = useGasFeeEstimates(tx?.networkClientId);
  const {
    paramsForController,
    networkFeeNative,
    networkFeeFiat,
    nativeTokenSymbol,
    isInitialGasReady,
    isTransactionModifiable,
  } = useCancelSpeedupGas({ txId: tx?.id });

  // Seed the transaction with bump params when cancel/speed up modal opens so the gas modal shows suggested values.
  // Stores the original gas as previousGas first (prevents re-seeding on subsequent renders).
  useEffect(() => {
    if (!isVisible || !tx?.id || !isTransactionModifiable) return;
    if (tx.previousGas) return;

    const { txParams } = tx;
    if (txParams) {
      if (isEIP1559Transaction(txParams)) {
        updatePreviousGasParams(tx.id, {
          maxFeePerGas: txParams.maxFeePerGas as string,
          maxPriorityFeePerGas: txParams.maxPriorityFeePerGas as string,
          gasLimit: (txParams.gasLimit ?? txParams.gas) as string,
        });
      } else {
        updatePreviousGasParams(tx.id, {
          gasLimit: (txParams.gasLimit ?? txParams.gas) as string,
        });
      }
    }

    const bumpResult = getBumpParamsForCancelSpeedup(
      tx,
      isCancel,
      gasFeeEstimates,
    );
    if (bumpResult) {
      updateTransactionGasFees(tx.id, {
        ...bumpResult.gasValues,
        userFeeLevel: bumpResult.userFeeLevel,
      });
    }
  }, [
    isVisible,
    tx?.id,
    isCancel,
    gasFeeEstimates,
    tx,
    isTransactionModifiable,
  ]);

  // Dismiss gas modal when parent cancel/speed up modal closes.
  useEffect(() => {
    if (!isVisible) {
      setGasModalVisible(false);
    }
  }, [isVisible]);

  // Close the gas modal when the transaction is no longer modifiable.
  useEffect(() => {
    if (isVisible && gasModalVisible && !isTransactionModifiable) {
      setGasModalVisible(false);
    }
  }, [isVisible, gasModalVisible, isTransactionModifiable]);

  const openGasModal = useCallback(() => {
    setGasModalVisible(true);
  }, []);

  const close = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const effectiveConfirmDisabled = confirmDisabled || !isInitialGasReady;

  const handleConfirm = useCallback(() => {
    if (effectiveConfirmDisabled) return;
    onConfirm(paramsForController);
  }, [onConfirm, paramsForController, effectiveConfirmDisabled]);

  const title = isCancel
    ? strings('transaction.cancel_speedup_cancel_title')
    : strings('transaction.cancel_speedup_speedup_title');
  const description = isCancel
    ? strings('transaction.cancel_speedup_cancel_message')
    : strings('transaction.cancel_speedup_speedup_message');

  const chainId = (tx?.chainId ?? '') as Hex;

  const buttons = [
    {
      variant: ButtonVariants.Primary,
      label: strings('transaction.confirm'),
      size: ButtonSize.Lg,
      onPress: handleConfirm,
      isDisabled: effectiveConfirmDisabled,
    },
  ];

  return (
    <Modal
      isVisible={isVisible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={modalStyle.bottom}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      useNativeDriver
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
    >
      <BottomSheet
        ref={bottomSheetRef}
        shouldNavigateBack={false}
        onClose={onClose}
        style={styles.bottomSheetDialogSheet}
      >
        <HeaderCompactStandard title={title} onClose={close} />
        <Box style={tw.style('px-3')}>
          <Box gap={4}>
            <InfoSection>
              <NetworkFeeRow
                fiat={networkFeeFiat}
                native={networkFeeNative}
                symbol={nativeTokenSymbol}
                chainId={chainId}
                onEditPress={
                  isTransactionModifiable
                    ? isTransactionModifiable
                      ? openGasModal
                      : undefined
                    : undefined
                }
              />
              <SpeedRow transactionId={tx?.id} />
            </InfoSection>
            <Description text={description} />
          </Box>
          <BottomSheetFooter
            buttonsAlignment={ButtonsAlignment.Vertical}
            buttonPropsArray={buttons}
            style={tw.style('px-0')}
          />
        </Box>
      </BottomSheet>
      {gasModalVisible && tx?.id && (
        <GasFeeModalTransactionProvider transactionId={tx.id}>
          <GasFeeModal setGasModalVisible={setGasModalVisible} />
        </GasFeeModalTransactionProvider>
      )}
    </Modal>
  );
}
