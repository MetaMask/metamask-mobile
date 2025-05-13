import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';
import { TransactionMeta } from '@metamask/transaction-controller';
import { pickBy } from 'lodash';

import { useStyles } from '../../../../../../../../component-library/hooks';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../../../locales/i18n';
import { updateTransactionGasFees } from '../../../../../../../../util/transaction-controller';
import { useTransactionMetadataRequest } from '../../../../../hooks/transactions/useTransactionMetadataRequest';
import BottomModal from '../../../../UI/bottom-modal';
import { GasModalHeader } from '../../components/gas-modal-header';
import { GasModalType } from '../../constants';
import { GasLimitInput } from '../../components/gas-limit-input';
import { MaxBaseFeeInput } from '../../components/max-base-fee-input';
import { PriorityFeeInput } from '../../components/priority-fee-input';
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

  const [gasParams, setGasParams] = useState<{
    gas: Hex | null;
    maxFeePerGas: Hex | null;
    maxPriorityFeePerGas: Hex | null;
  }>({
    gas: null,
    maxFeePerGas: null,
    maxPriorityFeePerGas: null,
  });

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

  const handleMaxBaseFeeChange = (value: Hex) => {
    setGasParams({
      ...gasParams,
      maxFeePerGas: value,
    });
  };

  const handlePriorityFeeChange = (value: Hex) => {
    setGasParams({
      ...gasParams,
      maxPriorityFeePerGas: value,
    });
  };

  const navigateToEstimatesModal = useCallback(() => {
    setActiveModal(GasModalType.ESTIMATES);
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
          <MaxBaseFeeInput onChange={handleMaxBaseFeeChange} />
          <PriorityFeeInput onChange={handlePriorityFeeChange} />
          <GasLimitInput onChange={handleGasLimitChange} />
        </View>
        <Button
          style={styles.button}
          onPress={handleSaveClick}
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          label={strings('transactions.gas_modal.save')}
        />
      </View>
    </BottomModal>
  );
};
