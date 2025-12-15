/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import BigNumber from 'bignumber.js';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { EditGasViewSelectorsIDs } from '../../../../../../../e2e/selectors/SendFlow/EditGasView.selectors';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useGasTransaction } from '../../../../../../core/GasPolling/GasPolling';
import { selectGasFeeEstimates } from '../../../../../../selectors/confirmTransaction';
import { selectGasFeeControllerEstimateType } from '../../../../../../selectors/gasFeeController';
import { selectPrimaryCurrency } from '../../../../../../selectors/settings';
import {
  GAS_LIMIT_INCREMENT,
  GAS_LIMIT_MIN,
  GAS_PRICE_INCREMENT,
  GAS_PRICE_MIN,
} from '../../../../../../util/gasUtils';
import {
  getDecimalChainId,
  isMainnetByChainId,
} from '../../../../../../util/networks';
import { useTheme } from '../../../../../../util/theme';
import Alert, { AlertType } from '../../../../../Base/Alert';
import RangeInput from '../../../../../Base/RangeInput';
import { useMetrics } from '../../../../../hooks/useMetrics';
import FadeAnimationView from '../../../../../UI/FadeAnimationView';
import StyledButton from '../../../../../UI/StyledButton';
import InfoModal from '../../../../../Base/InfoModal';
import createStyles from './styles';

const EditGasFeeLegacy = ({
  onCancel,
  onSave,
  error,
  warning,
  onUpdatingValuesStart,
  onUpdatingValuesEnd,
  animateOnChange,
  isAnimating,
  analyticsParams,
  view,
  onlyGas,
  selectedGasObject,
  hasDappSuggestedGas,
  chainId,
}) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const [showRangeInfoModal, setShowRangeInfoModal] = useState(false);
  const [infoText, setInfoText] = useState('');
  const [gasPriceError, setGasPriceError] = useState('');
  const [showEditUI, setShowEditUI] = useState(!hasDappSuggestedGas);
  const [gasObjectLegacy, updateGasObjectLegacy] = useState({
    legacyGasLimit: selectedGasObject.legacyGasLimit,
    suggestedGasPrice:
      selectedGasObject.suggestedGasPrice ||
      selectedGasObject.suggestedMaxFeePerGas,
  });

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const gasFeeEstimate = useSelector(selectGasFeeEstimates);

  const primaryCurrency = useSelector(selectPrimaryCurrency);

  const gasEstimateType = useSelector(selectGasFeeControllerEstimateType);

  const gasTransaction = useGasTransaction({
    onlyGas,
    legacy: true,
    gasObjectLegacy,
  });

  const save = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.GAS_FEE_CHANGED)
        .addProperties({
          ...analyticsParams,
          chain_id: getDecimalChainId(chainId),
          function_type: view,
          gas_mode: 'Basic',
        })
        .build(),
    );

    const newGasPriceObject = {
      suggestedGasPrice: gasObjectLegacy?.suggestedGasPrice,
      legacyGasLimit: gasObjectLegacy?.legacyGasLimit,
    };
    onSave(gasTransaction, newGasPriceObject);
  }, [
    onSave,
    gasTransaction,
    gasObjectLegacy,
    analyticsParams,
    chainId,
    view,
    trackEvent,
    createEventBuilder,
  ]);

  const changeGas = useCallback((gas) => {
    updateGasObjectLegacy({
      legacyGasLimit: gas.suggestedGasLimit,
      suggestedGasPrice: gas.suggestedGasPrice,
    });
  }, []);

  const changedGasPrice = useCallback(
    (value) => {
      let newGas;

      const lowerValue = new BigNumber(
        gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
          ? gasFeeEstimate?.low
          : gasFeeEstimate?.gasPrice,
      );
      const higherValue = new BigNumber(
        gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
          ? gasFeeEstimate?.high
          : gasFeeEstimate?.gasPrice,
      ).multipliedBy(new BigNumber(1.5));

      const valueBN = new BigNumber(value);

      if (!lowerValue.isNaN() && valueBN.lt(lowerValue)) {
        setGasPriceError(strings('edit_gas_fee_eip1559.gas_price_low'));
      } else if (!higherValue.isNaN() && valueBN.gt(higherValue)) {
        setGasPriceError(strings('edit_gas_fee_eip1559.gas_price_high'));
      } else {
        setGasPriceError('');
      }

      if (typeof gasTransaction === 'object') {
        newGas = { ...gasTransaction, suggestedGasPrice: value };
      } else {
        newGas = { suggestedGasPrice: value };
      }

      changeGas(newGas);
    },
    [changeGas, gasEstimateType, gasTransaction, gasFeeEstimate],
  );

  const changedGasLimit = useCallback(
    (value) => {
      const newGas =
        typeof gasTransaction === 'object'
          ? { ...gasTransaction, suggestedGasLimit: value }
          : { suggestedGasLimit: value };

      changeGas(newGas);
    },
    [changeGas, gasTransaction],
  );

  const showTransactionWarning = useMemo(() => {
    if (!warning) return null;
    if (typeof warning === 'string')
      return (
        <Alert
          small
          type={AlertType.Warning}
          renderIcon={() => (
            <MaterialCommunityIcon
              name="information"
              size={20}
              color={colors.warning.default}
            />
          )}
        >
          {() => (
            <View>
              <Text color={TextColor.Warning} style={styles.text}>
                {warning}
              </Text>
            </View>
          )}
        </Alert>
      );

    return warning;
  }, [warning, styles, colors]);

  const showTransactionError = useMemo(() => {
    if (!error) return null;
    if (typeof error === 'string')
      return (
        <Alert
          small
          type={AlertType.Error}
          renderIcon={() => (
            <MaterialCommunityIcon
              name="information"
              size={20}
              color={colors.error.default}
            />
          )}
        >
          {() => (
            <View>
              <Text color={TextColor.Error} style={styles.text}>
                {error}
              </Text>
            </View>
          )}
        </Alert>
      );

    return error;
  }, [error, styles, colors]);

  const {
    suggestedGasLimit,
    suggestedGasPrice,
    transactionFee,
    transactionFeeFiat,
  } = gasTransaction;

  const isMainnet = isMainnetByChainId(chainId);
  const nativeCurrencySelected = primaryCurrency === 'ETH' || !isMainnet;
  let gasFeePrimary, gasFeeSecondary;
  if (nativeCurrencySelected) {
    gasFeePrimary = transactionFee;
    gasFeeSecondary = transactionFeeFiat;
  } else {
    gasFeePrimary = transactionFeeFiat;
    gasFeeSecondary = transactionFee;
  }

  const valueToWatch = transactionFee;

  const handleInfoModalPress = (text) => {
    setShowRangeInfoModal(true);
    setInfoText(text);
  };

  return (
    <View style={styles.root} testID={EditGasViewSelectorsIDs.LEGACY_CONTAINER}>
      <ScrollView style={styles.wrapper}>
        <TouchableWithoutFeedback>
          <View>
            <View>
              <View style={styles.customGasHeader}>
                <TouchableOpacity onPress={onCancel}>
                  <Icon
                    name={'arrow-back'}
                    size={24}
                    color={colors.text.default}
                  />
                </TouchableOpacity>
                <Text variant={TextVariant.HeadingSM}>
                  {strings('transaction.edit_priority')}
                </Text>
                <Icon
                  name={'arrow-back'}
                  size={24}
                  color={colors.background.default}
                />
              </View>
            </View>
            {showTransactionWarning}
            {showTransactionError}

            {!showEditUI ? (
              <View style={styles.dappEditGasContainer}>
                <View style={styles.headerContainer}>
                  <Text variant={TextVariant.DisplayMD} style={{}}>
                    ~ {gasFeePrimary}
                  </Text>
                  <View style={styles.headerTitleSide} />
                  <Text
                    variant={TextVariant.BodyLGMedium}
                    color={TextColor.Alternative}
                  >
                    {gasFeeSecondary}
                  </Text>
                </View>
                <StyledButton
                  type={'orange'}
                  onPress={() => setShowEditUI(true)}
                >
                  {strings('edit_gas_fee_eip1559.edit_suggested_gas_fee')}
                </StyledButton>
              </View>
            ) : (
              <View style={styles.dappEditGasContainer}>
                <FadeAnimationView
                  valueToWatch={valueToWatch}
                  animateOnChange={animateOnChange}
                  onAnimationStart={onUpdatingValuesStart}
                  onAnimationEnd={onUpdatingValuesEnd}
                >
                  <View style={styles.headerContainer}>
                    <Text variant={TextVariant.DisplayMD} style={{}}>
                      ~ {gasFeePrimary}
                    </Text>
                    <View style={styles.headerTitleSide} />
                    <Text
                      variant={TextVariant.BodyLGMedium}
                      color={TextColor.Alternative}
                    >
                      {gasFeeSecondary}
                    </Text>
                  </View>
                  <View style={styles.rangeInputContainer}>
                    <RangeInput
                      leftLabelComponent={
                        <View style={styles.labelTextContainer}>
                          <Text variant={TextVariant.BodyMDBold}>
                            {strings('edit_gas_fee_eip1559.gas_limit')}{' '}
                          </Text>

                          <TouchableOpacity
                            hitSlop={styles.hitSlop}
                            onPress={() => handleInfoModalPress('gas_limit')}
                          >
                            <MaterialCommunityIcon
                              name="information"
                              size={14}
                              style={styles.labelInfo}
                            />
                          </TouchableOpacity>
                        </View>
                      }
                      value={suggestedGasLimit}
                      onChangeValue={changedGasLimit}
                      min={GAS_LIMIT_MIN}
                      name={strings('edit_gas_fee_eip1559.gas_limit')}
                      increment={GAS_LIMIT_INCREMENT}
                    />
                  </View>
                  <View style={styles.rangeInputContainer}>
                    <RangeInput
                      leftLabelComponent={
                        <View style={styles.labelTextContainer}>
                          <Text variant={TextVariant.BodyMDBold}>
                            {strings('edit_gas_fee_eip1559.gas_price')}{' '}
                          </Text>
                          <Text color={TextColor.Alternative}>(GWEI) </Text>

                          <TouchableOpacity
                            hitSlop={styles.hitSlop}
                            onPress={() => handleInfoModalPress('gas_price')}
                          >
                            <MaterialCommunityIcon
                              name="information"
                              size={14}
                              style={styles.labelInfo}
                            />
                          </TouchableOpacity>
                        </View>
                      }
                      value={suggestedGasPrice}
                      name={strings('edit_gas_fee_eip1559.gas_price')}
                      increment={GAS_PRICE_INCREMENT}
                      min={GAS_PRICE_MIN}
                      inputInsideLabel={
                        transactionFeeFiat && `≈ ${transactionFeeFiat}`
                      }
                      onChangeValue={changedGasPrice}
                      error={gasPriceError}
                    />
                  </View>
                </FadeAnimationView>
                <View>
                  <StyledButton
                    type={'confirm'}
                    onPress={save}
                    disabled={Boolean(error) || isAnimating}
                  >
                    {strings('edit_gas_fee_eip1559.save')}
                  </StyledButton>
                </View>
              </View>
            )}
            <InfoModal
              isVisible={Boolean(showRangeInfoModal)}
              title={
                infoText === 'gas_limit'
                  ? strings('edit_gas_fee_eip1559.gas_limit')
                  : infoText === 'gas_price'
                    ? strings('edit_gas_fee_eip1559.gas_price')
                    : null
              }
              toggleModal={() => setShowRangeInfoModal(false)}
              body={
                <View>
                  <Text color={TextColor.Alternative}>
                    {infoText === 'gas_limit' &&
                      strings(
                        'edit_gas_fee_eip1559.learn_more_gas_limit_legacy',
                      )}
                    {infoText === 'gas_price' &&
                      strings('edit_gas_fee_eip1559.learn_more_gas_price')}
                  </Text>
                </View>
              }
            />
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  );
};

export default EditGasFeeLegacy;
