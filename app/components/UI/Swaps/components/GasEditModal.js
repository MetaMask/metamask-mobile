import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Modal from 'react-native-modal';
import { GAS_ESTIMATE_TYPES } from '@metamask/controllers';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { connect } from 'react-redux';
import Text from '../../../Base/Text';
import InfoModal from './InfoModal';
import EditGasFeeLegacy from '../../EditGasFeeLegacy';
import EditGasFee1559 from '../../EditGasFee1559Update';
import { parseTransactionLegacy } from '../../../../util/transactions';
import useModalHandler from '../../../Base/hooks/useModalHandler';
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';
import { useTheme } from '../../../../util/theme';

const GAS_OPTIONS = AppConstants.GAS_OPTIONS;

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  keyboardAwareWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  text: {
    lineHeight: 20,
  },
});

function GasEditModal({
  dismiss,
  gasEstimateType,
  gasFeeEstimates,
  defaultGasFeeOptionLegacy = GAS_OPTIONS.MEDIUM,
  defaultGasFeeOptionFeeMarket = GAS_OPTIONS.HIGH,
  isVisible,
  onGasUpdate,
  customGasFee,
  initialGasLimit,
  isNativeAsset,
  tradeValue,
  sourceAmount,
  checkEnoughEthBalance,
  currentCurrency,
  conversionRate,
  primaryCurrency,
  chainId,
  ticker,
  animateOnChange,
}) {
  const [gasSelected, setGasSelected] = useState(
    customGasFee
      ? customGasFee.selected ?? null
      : gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET
      ? defaultGasFeeOptionFeeMarket
      : defaultGasFeeOptionLegacy,
  );
  const [stopUpdateGas, setStopUpdateGas] = useState(false);
  const [hasEnoughEthBalance, setHasEnoughEthBalance] = useState(true);
  const [eip1559GasTransaction, setEip1559GasTransaction] = useState({});
  const [eip1559GasObject, setEip1559GasObject] = useState({});
  const [LegacyTransactionDataTemp, setLegacyTransactionDataTemp] = useState(
    {},
  );
  const [
    isGasFeeRecommendationVisible,
    ,
    showGasFeeRecommendation,
    hideGasFeeRecommendation,
  ] = useModalHandler(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    if (
      eip1559GasTransaction &&
      Object.keys(eip1559GasTransaction).length > 0
    ) {
      setHasEnoughEthBalance(
        checkEnoughEthBalance(eip1559GasTransaction?.totalMaxHex?.toString(16)),
      );
    } else if (
      LegacyTransactionDataTemp &&
      Object.keys(LegacyTransactionDataTemp).length > 0
    ) {
      setHasEnoughEthBalance(
        checkEnoughEthBalance(
          LegacyTransactionDataTemp?.totalHex?.toString(16),
        ),
      );
    }
  }, [eip1559GasTransaction, LegacyTransactionDataTemp, checkEnoughEthBalance]);

  useEffect(() => {
    if (stopUpdateGas || !gasSelected) {
      return;
    }
    if (gasEstimateType !== GAS_ESTIMATE_TYPES.FEE_MARKET) {
      setLegacyTransactionDataTemp(
        parseTransactionLegacy(
          {
            currentCurrency,
            conversionRate,
            ticker,
            selectedGasFee: {
              suggestedGasLimit: initialGasLimit,
              suggestedGasPrice:
                gasEstimateType === GAS_ESTIMATE_TYPES.ETH_GASPRICE
                  ? gasFeeEstimates.gasPrice
                  : gasFeeEstimates[gasSelected],
            },
          },
          { onlyGas: true },
        ),
      );
    }
  }, [
    conversionRate,
    currentCurrency,
    gasEstimateType,
    gasFeeEstimates,
    gasSelected,
    initialGasLimit,
    stopUpdateGas,
    ticker,
    tradeValue,
  ]);

  const updateGasSelected = (selected) => {
    setStopUpdateGas(!selected);
    setGasSelected(selected);
  };

  const calculateTempGasFeeLegacy = useCallback(
    ({ suggestedGasLimit, suggestedGasPrice }, selected) => {
      setStopUpdateGas(!selected);
      setGasSelected(selected);
      setLegacyTransactionDataTemp(
        parseTransactionLegacy(
          {
            currentCurrency,
            conversionRate,
            ticker,
            selectedGasFee: {
              suggestedGasLimit: selected ? initialGasLimit : suggestedGasLimit,
              suggestedGasPrice,
            },
          },
          { onlyGas: true },
        ),
      );
    },
    [conversionRate, currentCurrency, initialGasLimit, ticker],
  );

  const saveGasEdition = useCallback(
    (gasTransaction, gasObject) => {
      if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
        setEip1559GasTransaction(gasTransaction);
        setEip1559GasObject(gasObject);
        const {
          suggestedMaxFeePerGas: maxFeePerGas,
          suggestedMaxPriorityFeePerGas: maxPriorityFeePerGas,
          estimatedBaseFee,
          suggestedGasLimit,
        } = gasObject;
        onGasUpdate(
          {
            maxFeePerGas,
            maxPriorityFeePerGas,
            estimatedBaseFee,
            selected: gasSelected,
          },
          suggestedGasLimit,
        );
      } else {
        const { suggestedGasPrice: gasPrice, suggestedGasLimit } =
          LegacyTransactionDataTemp;
        onGasUpdate(
          {
            gasPrice,
            selected: gasSelected,
          },
          suggestedGasLimit,
        );
      }
      dismiss();
    },
    [
      LegacyTransactionDataTemp,
      dismiss,
      gasEstimateType,
      gasSelected,
      onGasUpdate,
    ],
  );

  const cancelGasEdition = useCallback(() => {
    setGasSelected(
      customGasFee
        ? customGasFee.selected ?? null
        : gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET
        ? GAS_OPTIONS.HIGH
        : GAS_OPTIONS.MEDIUM,
    );
    dismiss();
  }, [customGasFee, dismiss, gasEstimateType]);

  const currentGasPriceObject = {
    suggestedMaxFeePerGas:
      eip1559GasObject.suggestedMaxFeePerGas ||
      gasFeeEstimates[gasSelected]?.suggestedMaxFeePerGas,
    suggestedMaxPriorityFeePerGas:
      eip1559GasObject.suggestedMaxPriorityFeePerGas ||
      gasFeeEstimates[gasSelected]?.suggestedMaxPriorityFeePerGas,
  };

  const onGasAnimationStart = useCallback(() => setIsAnimating(true), []);
  const onGasAnimationEnd = useCallback(() => setIsAnimating(false), []);
  const swaps = {
    isNativeAsset,
    tradeValue,
    sourceAmount,
  };

  const selectedGasObject = {
    suggestedMaxFeePerGas:
      eip1559GasObject.suggestedMaxFeePerGas ||
      gasFeeEstimates[gasSelected]?.suggestedMaxFeePerGas,
    suggestedMaxPriorityFeePerGas:
      eip1559GasObject.suggestedMaxPriorityFeePerGas ||
      gasFeeEstimates[gasSelected]?.suggestedMaxPriorityFeePerGas,
    suggestedGasLimit:
      eip1559GasObject.suggestedGasLimit ||
      eip1559GasTransaction.suggestedGasLimit ||
      initialGasLimit,
  };

  return (
    <Modal
      isVisible={isVisible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackdropPress={cancelGasEdition}
      onBackButtonPress={cancelGasEdition}
      onSwipeComplete={cancelGasEdition}
      swipeDirection={'down'}
      propagateSwipe
    >
      <KeyboardAwareScrollView
        contentContainerStyle={styles.keyboardAwareWrapper}
      >
        {gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET ? (
          <>
            <EditGasFee1559
              selectedGasValue={gasSelected}
              gasOptions={gasFeeEstimates}
              onChange={updateGasSelected}
              primaryCurrency={primaryCurrency}
              chainId={chainId}
              onCancel={cancelGasEdition}
              onSave={saveGasEdition}
              animateOnChange={animateOnChange}
              isAnimating={isAnimating}
              view="Swaps"
              ignoreOptions={[GAS_OPTIONS.LOW]}
              extendOptions={{ [GAS_OPTIONS.MEDIUM]: { error: true } }}
              warningMinimumEstimateOption={GAS_OPTIONS.MEDIUM}
              selectedGasObject={selectedGasObject}
              warning={
                gasSelected === GAS_OPTIONS.MEDIUM
                  ? strings('swaps.medium_selected_warning')
                  : undefined
              }
              error={
                !hasEnoughEthBalance
                  ? strings('transaction.insufficient')
                  : eip1559GasTransaction.error
              }
              suggestedEstimateOption={defaultGasFeeOptionFeeMarket}
              recommended={{
                name: GAS_OPTIONS.HIGH,
                // eslint-disable-next-line react/display-name
                render: () => (
                  <TouchableOpacity onPress={showGasFeeRecommendation}>
                    <Text noMargin link bold small centered>
                      {`${strings('swaps.recommended')} `}
                      <MaterialCommunityIcon
                        name="information"
                        size={14}
                        style={styles.labelInfo}
                      />
                    </Text>
                  </TouchableOpacity>
                ),
              }}
              onUpdatingValuesStart={onGasAnimationStart}
              onUpdatingValuesEnd={onGasAnimationEnd}
              currentGasPriceObject={currentGasPriceObject}
              onlyGas
              swapsParams={swaps}
            />
            <InfoModal
              isVisible={isVisible && isGasFeeRecommendationVisible}
              toggleModal={hideGasFeeRecommendation}
              title={strings('swaps.recommended_gas')}
              body={
                <Text style={styles.text}>
                  {strings('swaps.high_recommendation')}
                </Text>
              }
            />
          </>
        ) : (
          <EditGasFeeLegacy
            selected={gasSelected}
            ignoreOptions={[GAS_OPTIONS.LOW]}
            warningMinimumEstimateOption={GAS_OPTIONS.MEDIUM}
            gasFee={LegacyTransactionDataTemp}
            gasEstimateType={gasEstimateType}
            gasOptions={gasFeeEstimates}
            onChange={calculateTempGasFeeLegacy}
            gasFeeNative={LegacyTransactionDataTemp.transactionFee}
            gasFeeConversion={LegacyTransactionDataTemp.transactionFeeFiat}
            gasPriceConversion={LegacyTransactionDataTemp.transactionFeeFiat}
            error={
              !hasEnoughEthBalance
                ? strings('transaction.insufficient')
                : LegacyTransactionDataTemp.error
            }
            primaryCurrency={primaryCurrency}
            chainId={chainId}
            onCancel={cancelGasEdition}
            onSave={saveGasEdition}
            view="Swaps"
            animateOnChange={animateOnChange}
            isAnimating={isAnimating}
            onUpdatingValuesStart={onGasAnimationStart}
            onUpdatingValuesEnd={onGasAnimationEnd}
          />
        )}
      </KeyboardAwareScrollView>
    </Modal>
  );
}

GasEditModal.propTypes = {
  /**
   * Function to dismiss modal
   */
  dismiss: PropTypes.func,
  /**
   * Estimate type returned by the gas fee controller, can be fee-market, legacy, eth_gasPrice or none
   */
  gasEstimateType: PropTypes.string,
  /**
   * Gas fee estimates returned by the gas fee controller
   */
  gasFeeEstimates: PropTypes.object,
  /**
   * Default gas option ('low', 'medium' or 'high') to for fee-market estimate type
   * This is used to show a warning below this option
   */
  defaultGasFeeOptionFeeMarket: PropTypes.string,
  /**
   * Default gas option ('low', 'medium' or 'high') to for legacy estimate types
   * This is used to show a warning below this option
   */
  defaultGasFeeOptionLegacy: PropTypes.string,
  /**
   * Wether this modal is visible
   */
  isVisible: PropTypes.bool,
  /**
   * Function that handles user saving the gas editors
   * It is called with arguments (customGas, )
   */
  onGasUpdate: PropTypes.func,
  /**
   * usedCustomGas from Swaps Controller
   */
  customGasFee: PropTypes.object,
  /**
   * Initial gas limit of the selected quote trade
   */
  initialGasLimit: PropTypes.string,
  /**
   * Currency code of the currently-active currency
   */
  currentCurrency: PropTypes.string,
  /**
   * ETH to current currency conversion rate
   */
  conversionRate: PropTypes.number,
  /**
   * Primary currency, either ETH or Fiat
   */
  primaryCurrency: PropTypes.string,
  /**
   * Chain Id
   */
  chainId: PropTypes.string,
  /**
   * Current network ticker
   */
  ticker: PropTypes.string,
  /**
   * Function to check if user has enough balance
   */
  checkEnoughEthBalance: PropTypes.func,
  /**
   * Wether the swap is from native asset
   */
  isNativeAsset: PropTypes.bool,
  /**
   * Value of the trade
   */
  tradeValue: PropTypes.string,
  /**
   * Amount of the swap
   */
  sourceAmount: PropTypes.string,
  /**
   * If the values should animate upon update or not
   */
  animateOnChange: PropTypes.bool,
};
const mapStateToProps = (state) => ({
  currentCurrency:
    state.engine.backgroundState.CurrencyRateController.currentCurrency,
  conversionRate:
    state.engine.backgroundState.CurrencyRateController.conversionRate,
  nativeCurrency:
    state.engine.backgroundState.CurrencyRateController.nativeCurrency,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
  primaryCurrency: state.settings.primaryCurrency,
});

export default connect(mapStateToProps)(GasEditModal);
