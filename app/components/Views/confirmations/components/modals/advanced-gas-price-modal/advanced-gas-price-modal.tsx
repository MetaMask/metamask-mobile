import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';
import { pickBy } from 'lodash';
import { TransactionMeta } from '@metamask/transaction-controller';

import { useStyles } from '../../../../../../component-library/hooks';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../locales/i18n';
import { updateTransactionGasFees } from '../../../../../../util/transaction-controller';
import { GasModalHeader } from '../../../components/gas/gas-modal-header';
import { GasModalType } from '../../../constants/gas';
import { GasInput } from '../../../components/gas/gas-input';
import { GasPriceInput } from '../../../components/gas/gas-price-input';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import BottomModal from '../../UI/bottom-modal';
import styleSheet from './advanced-gas-price-modal.styles';

export const AdvancedGasPriceModal = ({
  setActiveModal,
  handleCloseModals,
}: {
  setActiveModal: (modal: GasModalType) => void;
  handleCloseModals: () => void;
}) => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;

  const { gas, gasPrice } = transactionMeta?.txParams || {};

  const [gasParams, setGasParams] = useState<{
    gas: Hex;
    gasPrice: Hex;
  }>({
    gas: gas as Hex,
    gasPrice: gasPrice as Hex,
  });

  const [errors, setErrors] = useState({
    gas: false,
    gasPrice: false,
  });
  const hasError = Boolean(errors.gas || errors.gasPrice);

  const handleSaveClick = useCallback(() => {
    updateTransactionGasFees(transactionMeta.id, {
      userFeeLevel: 'custom',
      ...pickBy(gasParams, Boolean),
    });
    handleCloseModals();
  }, [transactionMeta.id, gasParams, handleCloseModals]);

  const navigateToEstimatesModal = useCallback(() => {
    setActiveModal(GasModalType.ESTIMATES);
  }, [setActiveModal]);

  const createChangeHandler = useCallback(
    (key: 'gas' | 'gasPrice') => (value: Hex) =>
      setGasParams((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const handleGasChange = useMemo(
    () => createChangeHandler('gas'),
    [createChangeHandler],
  );
  const handleGasPriceChange = useMemo(
    () => createChangeHandler('gasPrice'),
    [createChangeHandler],
  );

  const createErrorHandler = useCallback(
    (key: 'gas' | 'gasPrice') => (error: string | boolean) =>
      setErrors((prev) => ({ ...prev, [key]: !!error })),
    [],
  );
  const handleGasError = useMemo(
    () => createErrorHandler('gas'),
    [createErrorHandler],
  );
  const handleGasPriceError = useMemo(
    () => createErrorHandler('gasPrice'),
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
          <GasPriceInput
            onChange={handleGasPriceChange}
            onErrorChange={handleGasPriceError}
          />
          <GasInput onChange={handleGasChange} onErrorChange={handleGasError} />
        </View>
        <Button
          isDisabled={hasError}
          label={strings('transactions.gas_modal.save')}
          onPress={handleSaveClick}
          size={ButtonSize.Lg}
          style={styles.button}
          testID="save-gas-price-button"
          variant={ButtonVariants.Primary}
        />
      </View>
    </BottomModal>
  );
};
