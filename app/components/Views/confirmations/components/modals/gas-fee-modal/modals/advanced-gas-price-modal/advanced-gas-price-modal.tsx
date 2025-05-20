import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';
import { pickBy } from 'lodash';
import { TransactionMeta } from '@metamask/transaction-controller';

import { useStyles } from '../../../../../../../../component-library/hooks';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../../../locales/i18n';
import BottomModal from '../../../../UI/bottom-modal';
import { GasModalHeader } from '../../components/gas-modal-header';
import { GasModalType } from '../../constants';
import { GasLimitInput } from '../../components/gas-limit-input';
import styleSheet from './advanced-gas-price-modal.styles';
import { updateTransactionGasFees } from '../../../../../../../../util/transaction-controller';
import { useTransactionMetadataRequest } from '../../../../../hooks/transactions/useTransactionMetadataRequest';
import { GasPriceInput } from '../../components/gas-price-input';

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
    gasLimit: false,
    gasPrice: false,
  });
  const isAnyErrorExists = errors.gasLimit || errors.gasPrice;

  const handleSaveClick = useCallback(() => {
    updateTransactionGasFees(transactionMeta.id, {
      userFeeLevel: 'custom',
      ...pickBy(gasParams, Boolean),
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
    setActiveModal(GasModalType.ESTIMATES);
  }, [setActiveModal]);

  const handleInputError = (
    key: 'gasLimit' | 'gasPrice',
    hasError: boolean,
  ) => {
    setErrors((prev) => ({ ...prev, [key]: hasError }));
  };

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
            onErrorChange={(hasError) =>
              handleInputError('gasPrice', !!hasError)
            }
          />
          <GasLimitInput
            onChange={handleGasLimitChange}
            onErrorChange={(hasError) =>
              handleInputError('gasLimit', !!hasError)
            }
          />
        </View>
        <Button
          isDisabled={isAnyErrorExists}
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
