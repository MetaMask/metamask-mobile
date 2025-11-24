import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';
import {
  TransactionMeta,
  UserFeeLevel,
} from '@metamask/transaction-controller';
import { pickBy } from 'lodash';

import { useStyles } from '../../../../../../component-library/hooks';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../locales/i18n';
import { updateTransactionGasFees } from '../../../../../../util/transaction-controller';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import BottomModal from '../../UI/bottom-modal';
import { GasModalHeader } from '../../../components/gas/gas-modal-header';
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
  const hasError = Boolean(
    errors.gas || errors.maxFeePerGas || errors.maxPriorityFeePerGas,
  );

  const handleSaveClick = useCallback(() => {
    updateTransactionGasFees(transactionMeta.id, {
      userFeeLevel: UserFeeLevel.CUSTOM,
      ...pickBy(gasParams, Boolean),
    });
    handleCloseModals();
  }, [transactionMeta.id, gasParams, handleCloseModals]);

  const navigateToEstimatesModal = useCallback(() => {
    setActiveModal(GasModalType.ESTIMATES);
  }, [setActiveModal]);

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
    <BottomModal
      avoidKeyboard
      onBackdropPress={navigateToEstimatesModal}
      onBackButtonPress={navigateToEstimatesModal}
      onSwipeComplete={navigateToEstimatesModal}
    >
      <View style={styles.container}>
        <GasModalHeader
          onBackButtonClick={navigateToEstimatesModal}
          title={strings('transactions.gas_modal.advanced_gas_fee')}
        />
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
          label={strings('transactions.gas_modal.save')}
          onPress={handleSaveClick}
          size={ButtonSize.Lg}
          style={styles.button}
          variant={ButtonVariants.Primary}
        />
      </View>
    </BottomModal>
  );
};
