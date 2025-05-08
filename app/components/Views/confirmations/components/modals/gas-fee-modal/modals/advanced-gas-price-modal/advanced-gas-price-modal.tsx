import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';
import { TransactionMeta } from '@metamask/transaction-controller';

import { useStyles } from '../../../../../../../../component-library/hooks';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../../../locales/i18n';
import BottomModal from '../../../../UI/bottom-modal';
import { GasModalHeader } from '../../components/gas-modal-header';
import { MODALS } from '../../constants';
import { GasLimitInput } from '../../components/gas-limit-input';
import styleSheet from './advanced-gas-price-modal.styles';
import { updateTransactionGasFees } from '../../../../../../../../util/transaction-controller';
import { useTransactionMetadataRequest } from '../../../../../hooks/transactions/useTransactionMetadataRequest';
import { GasPriceInput } from '../../components/gas-price-input';

export const AdvancedGasPriceModal = ({
  setActiveModal,
  handleCloseModals,
}: {
  setActiveModal: (modal: string) => void;
  handleCloseModals: () => void;
}) => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;

  const [gasParams, setGasParams] = useState<{
    gas: Hex | null;
    gasPrice: Hex | null;
  }>({
    gas: null,
    gasPrice: null,
  });

  const onSaveClick = useCallback(() => {
    updateTransactionGasFees(transactionMeta.id, {
      userFeeLevel: 'custom',
      gas: gasParams.gas as string,
      gasPrice: gasParams.gasPrice as string,
    });
    handleCloseModals();
  }, [transactionMeta.id, gasParams, handleCloseModals]);

  const handleGasLimitChange = (value: Hex) => {
    setGasParams({
      ...gasParams,
      gas: value,
    });
  };

  const handleGasPriceChange = (value: Hex) => {
    setGasParams({
      ...gasParams,
      gasPrice: value,
    });
  };

  const navigateToEstimatesModal = useCallback(() => {
    setActiveModal(MODALS.ESTIMATES);
  }, [setActiveModal]);

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
          <GasPriceInput onChange={handleGasPriceChange} />
          <GasLimitInput onChange={handleGasLimitChange} />
        </View>
        <Button
          style={styles.button}
          onPress={onSaveClick}
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          label={strings('transactions.gas_modal.save')}
          testID="save-gas-price-button"
        />
      </View>
    </BottomModal>
  );
};
