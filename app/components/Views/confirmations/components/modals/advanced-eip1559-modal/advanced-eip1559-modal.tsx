import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import { Hex } from '@metamask/utils';
import {
  TransactionMeta,
  UserFeeLevel,
} from '@metamask/transaction-controller';
import { pickBy } from 'lodash';

import { useStyles } from '../../../../../../component-library/hooks';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useAdvancedGasFeeModal } from '../../../hooks/gas/useAdvancedGasFeeModal';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { GasModalType } from '../../../constants/gas';
import { GasInput } from '../../../components/gas/gas-input';
import { MaxBaseFeeInput } from '../../../components/gas/max-base-fee-input';
import { PriorityFeeInput } from '../../../components/gas/priority-fee-input';
import styleSheet from './advanced-eip1559-modal.styles';

export const AdvancedEIP1559Modal = ({
  setActiveModal,
  handleCloseModals,
}: {
  setActiveModal: (modal: GasModalType) => void;
  handleCloseModals: () => void;
}) => {
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;

  const { gas, maxFeePerGas, maxPriorityFeePerGas } =
    transactionMeta?.txParams || {};

  const [gasParams, setGasParams] = useState<{
    gas: Hex;
    maxFeePerGas: Hex;
    maxPriorityFeePerGas: Hex;
  }>({
    gas: gas as Hex,
    maxFeePerGas: maxFeePerGas as Hex,
    maxPriorityFeePerGas: maxPriorityFeePerGas as Hex,
  });

  const [errors, setErrors] = useState({
    gas: false,
    maxFeePerGas: false,
    maxPriorityFeePerGas: false,
  });
  const savedGasFeePreferences = useMemo(
    () => ({
      userFeeLevel: UserFeeLevel.CUSTOM,
      ...pickBy(
        {
          maxBaseFee: gasParams.maxFeePerGas,
          priorityFee: gasParams.maxPriorityFeePerGas,
        },
        Boolean,
      ),
    }),
    [gasParams.maxFeePerGas, gasParams.maxPriorityFeePerGas],
  );
  const { hasError, handleSaveClick } = useAdvancedGasFeeModal({
    transactionMeta,
    gasParams,
    savedGasFeePreferences,
    errors,
    handleCloseModals,
  });

  const navigateToEstimatesModal = useCallback(() => {
    setActiveModal(GasModalType.ESTIMATES);
  }, [setActiveModal]);

  const handleSheetClosed = useCallback(() => {
    navigateToEstimatesModal();
  }, [navigateToEstimatesModal]);

  const handleRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const createChangeHandler = useCallback(
    (key: 'gas' | 'maxFeePerGas' | 'maxPriorityFeePerGas') => (value: Hex) =>
      setGasParams((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const handleGasLimitChange = useMemo(
    () => createChangeHandler('gas'),
    [createChangeHandler],
  );
  const handleMaxFeePerGasChange = useMemo(
    () => createChangeHandler('maxFeePerGas'),
    [createChangeHandler],
  );
  const handleMaxPriorityFeePerGasChange = useMemo(
    () => createChangeHandler('maxPriorityFeePerGas'),
    [createChangeHandler],
  );

  const createErrorHandler = useCallback(
    (key: 'gas' | 'maxFeePerGas' | 'maxPriorityFeePerGas') =>
      (error: string | boolean) =>
        setErrors((prev) => ({ ...prev, [key]: error })),
    [],
  );
  const handleGasError = useMemo(
    () => createErrorHandler('gas'),
    [createErrorHandler],
  );
  const handleMaxFeePerGasError = useMemo(
    () => createErrorHandler('maxFeePerGas'),
    [createErrorHandler],
  );
  const handleMaxPriorityFeePerGasError = useMemo(
    () => createErrorHandler('maxPriorityFeePerGas'),
    [createErrorHandler],
  );

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleRequestClose}
    >
      <BottomSheet
        ref={bottomSheetRef}
        keyboardAvoidingViewEnabled
        onClose={handleSheetClosed}
      >
        <BottomSheetHeader onClose={handleRequestClose}>
          {strings('transactions.gas_modal.advanced_gas_fee')}
        </BottomSheetHeader>
        <Box twClassName="flex flex-col p-4 pt-0">
          <View style={styles.inputsContainer}>
            <MaxBaseFeeInput
              onChange={handleMaxFeePerGasChange}
              maxPriorityFeePerGas={gasParams.maxPriorityFeePerGas}
              onErrorChange={handleMaxFeePerGasError}
            />
            <PriorityFeeInput
              onChange={handleMaxPriorityFeePerGasChange}
              maxFeePerGas={gasParams.maxFeePerGas}
              onErrorChange={handleMaxPriorityFeePerGasError}
            />
            <GasInput
              onChange={handleGasLimitChange}
              onErrorChange={handleGasError}
            />
          </View>
          <Button
            isDisabled={hasError}
            onPress={handleSaveClick}
            size={ButtonSize.Lg}
            style={styles.button}
            variant={ButtonVariant.Primary}
          >
            {strings('transactions.gas_modal.save')}
          </Button>
        </Box>
      </BottomSheet>
    </Modal>
  );
};
