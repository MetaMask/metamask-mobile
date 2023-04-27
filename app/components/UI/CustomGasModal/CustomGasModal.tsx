import React, { useState } from 'react';
import EditGasFee1559 from '../../UI/EditGasFee1559Update';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Modal from 'react-native-modal';
import EditGasFeeLegacy from '../../UI/EditGasFeeLegacyUpdate';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import createStyles from './CustomGasModal.styles';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../selectors/networkController';
import { CustomGasModalProps } from './CustomGasModal.types';

const CustomGasModal = ({
  gasSelected,
  animateOnChange,
  isAnimating,
  onlyGas,
  validateAmount,
  updateParent,
  legacy,
  legacyGasObj,
  EIP1559GasObj,
  EIP1559GasTxn,
}: CustomGasModalProps) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles();
  const transaction = useSelector((state: any) => state.transaction);
  const gasFeeEstimate = useSelector(
    (state: any) =>
      state.engine.backgroundState.GasFeeController.gasFeeEstimates,
  );
  const primaryCurrency = useSelector(
    (state: any) => state.settings.primaryCurrency,
  );
  const chainId = useSelector((state: any) => selectChainId(state));
  const selectedAsset = useSelector(
    (state: any) => state.transaction.selectedAsset,
  );
  const gasEstimateType = useSelector(
    (state: any) =>
      state.engine.backgroundState.GasFeeController.gasEstimateType,
  );

  const [selectedGas, setSelectedGas] = useState(gasSelected);
  const [eip1559Txn, setEIP1559Txn] = useState(EIP1559GasTxn);
  const [legacyGasObjs, setLegacyGasObjs] = useState(legacyGasObj);
  const [eip1559GasObjs, setEIP1559GasObjs] = useState(EIP1559GasObj);

  const getGasAnalyticsParams = () => {
    try {
      return {
        active_currency: { value: selectedAsset.symbol, anonymous: true },
        gas_estimate_type: gasEstimateType,
      };
    } catch (error) {
      return {};
    }
  };

  const saveSelectedGasOption = (
    gasTxn: { error: any; totalMaxHex: string; totalHex: string },
    gasObj: any,
    gasSelect?: string,
  ) => {
    const updatedTransactionFrom = {
      ...transaction,
      from: transaction?.transaction?.from,
    };
    gasTxn.error = validateAmount({
      transaction: updatedTransactionFrom,
      total: legacy ? gasTxn.totalHex : gasTxn.totalMaxHex,
    });
    if (legacy) {
      setLegacyGasObjs(gasObj);
      updateParent({
        legacyGasTransaction: gasTxn,
        legacyGasObject: gasObj,
        gasSelected: gasSelect,
        closeModal: true,
        stopUpdateGas: false,
        advancedGasInserted: !gasSelect,
        gasSelectedTemp: gasSelect,
      });
    } else {
      setEIP1559Txn(gasTxn);
      setEIP1559GasObjs(gasObj);
      updateParent({
        EIP1559GasTransaction: gasTxn,
        EIP1559GasObject: gasObj,
        gasSelectedTemp: selectedGas,
        gasSelected: selectedGas,
        closeModal: true,
      });
    }
  };

  const onChangeGas = (gas: string) => {
    setSelectedGas(gas);
    updateParent({ gasSelected: gas });
  };

  const onCancelGas = () => {
    updateParent({
      stopUpdateGas: false,
      gasSelectedTemp: selectedGas,
      closeModal: true,
    });
  };

  const selectedGasObject = legacy
    ? {
        legacyGasLimit: legacyGasObjs?.legacyGasLimit,
        suggestedGasPrice: legacyGasObjs?.suggestedGasPrice,
      }
    : {
        suggestedMaxFeePerGas:
          eip1559GasObjs?.suggestedMaxFeePerGas ||
          eip1559GasObjs[selectedGas]?.suggestedMaxFeePerGas,
        suggestedMaxPriorityFeePerGas:
          eip1559GasObjs?.suggestedMaxPriorityFeePerGas ||
          gasFeeEstimate[selectedGas]?.suggestedMaxPriorityFeePerGas,
        suggestedGasLimit:
          eip1559GasObjs.suggestedGasLimit || eip1559Txn.suggestedGasLimit,
      };

  return (
    <Modal
      isVisible
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackdropPress={onCancelGas}
      onBackButtonPress={onCancelGas}
      onSwipeComplete={onCancelGas}
      swipeDirection={'down'}
      propagateSwipe
    >
      <KeyboardAwareScrollView
        contentContainerStyle={styles.keyboardAwareWrapper}
      >
        {legacy ? (
          <EditGasFeeLegacy
            selected={selectedGas}
            gasEstimateType={gasEstimateType}
            gasOptions={gasFeeEstimate}
            onChange={onChangeGas}
            primaryCurrency={primaryCurrency}
            chainId={chainId}
            onCancel={onCancelGas}
            onSave={saveSelectedGasOption}
            animateOnChange={animateOnChange}
            isAnimating={isAnimating}
            analyticsParams={getGasAnalyticsParams()}
            view={'SendTo (Confirm)'}
            onlyGas={false}
            selectedGasObject={selectedGasObject}
          />
        ) : (
          <EditGasFee1559
            selectedGasValue={selectedGas}
            gasOptions={gasFeeEstimate}
            onChange={onChangeGas}
            primaryCurrency={primaryCurrency}
            chainId={chainId}
            onCancel={onCancelGas}
            onSave={saveSelectedGasOption}
            animateOnChange={animateOnChange}
            isAnimating={isAnimating}
            analyticsParams={getGasAnalyticsParams()}
            view={'SendTo (Confirm)'}
            selectedGasObject={selectedGasObject}
            onlyGas={onlyGas}
          />
        )}
      </KeyboardAwareScrollView>
    </Modal>
  );
};

export default CustomGasModal;
