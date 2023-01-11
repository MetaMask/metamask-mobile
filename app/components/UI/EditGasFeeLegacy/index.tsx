/* eslint-disable react/display-name */
import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import BigNumber from 'bignumber.js';
import Text from '../../Base/Text';
import StyledButton from '../StyledButton';
import RangeInput from '../../Base/RangeInput';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import InfoModal from '../Swaps/components/InfoModal';
import Icon from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../locales/i18n';
import Alert, { AlertType } from '../../Base/Alert';
import HorizontalSelector from '../../Base/HorizontalSelector';
import { isMainnetByChainId } from '../../../util/networks';
import FadeAnimationView from '../FadeAnimationView';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import AppConstants from '../../../core/AppConstants';
import { useTheme } from '../../../util/theme';
import { EditGasFeeLegacyUpdateProps } from './types';
import { useGasTransaction } from '../../../core/GasPolling/GasPolling';
import createStyles from './styles';

const GAS_LIMIT_INCREMENT = new BigNumber(1000);
const GAS_PRICE_INCREMENT = new BigNumber(1);
const GAS_LIMIT_MIN = new BigNumber(21000);
const GAS_PRICE_MIN = new BigNumber(0);

const EditGasFeeLegacy = ({
  selected,
  gasOptions,
  onChange,
  onCancel,
  onSave,
  primaryCurrency,
  chainId,
  gasEstimateType,
  error,
  warning,
  ignoreOptions,
  extendOptions = {},
  recommended,
  warningMinimumEstimateOption,
  onUpdatingValuesStart,
  onUpdatingValuesEnd,
  animateOnChange,
  isAnimating,
  analyticsParams,
  view,
  onlyGas,
  selectedGasObject,
}: EditGasFeeLegacyUpdateProps) => {
  const onlyAdvanced = gasEstimateType !== GAS_ESTIMATE_TYPES.LEGACY;
  const [showRangeInfoModal, setShowRangeInfoModal] = useState<boolean>(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(
    !selected || onlyAdvanced,
  );
  const [selectedOption, setSelectedOption] = useState<string>(selected);
  const [gasPriceError, setGasPriceError] = useState<string>('');
  const [gasObject, updateLegacyGasObject] = useState<{
    legacyGasLimit: string;
    suggestedGasPrice: string;
  }>({
    legacyGasLimit: selectedGasObject.legacyGasLimit,
    suggestedGasPrice: selectedGasObject.suggestedGasPrice,
  });
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const gasTransaction = useGasTransaction({
    onlyGas,
    gasSelected: selectedOption,
    legacy: true,
    gasObject,
  });

  const getAnalyticsParams = useCallback(() => {
    try {
      return {
        ...analyticsParams,
        chain_id: chainId,
        function_type: view,
        gas_mode: selectedOption ? 'Basic' : 'Advanced',
        speed_set: selectedOption || undefined,
      };
    } catch (err) {
      return {};
    }
  }, [analyticsParams, chainId, selectedOption, view]);

  const toggleAdvancedOptions = useCallback(() => {
    if (!showAdvancedOptions) {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.GAS_ADVANCED_OPTIONS_CLICKED,
        getAnalyticsParams(),
      );
    }
    setShowAdvancedOptions(!showAdvancedOptions);
  }, [getAnalyticsParams, showAdvancedOptions]);

  const save = useCallback(() => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.GAS_FEE_CHANGED,
      getAnalyticsParams(),
    );

    const newGasPriceObject = {
      suggestedGasPrice: gasObject?.suggestedGasPrice,
      legacyGasLimit: gasObject?.legacyGasLimit,
    };

    onSave(gasTransaction, newGasPriceObject, selectedOption);
  }, [getAnalyticsParams, onSave, gasTransaction, gasObject, selectedOption]);

  const changeGas = useCallback(
    (gas, option) => {
      setSelectedOption(option);
      updateLegacyGasObject({
        legacyGasLimit: gas.suggestedGasLimit,
        suggestedGasPrice: gas.suggestedGasPrice,
      });
      onChange(option);
    },
    [onChange],
  );

  const changedGasPrice = useCallback(
    (value: string) => {
      const lowerValue = new BigNumber(
        gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
          ? gasOptions?.[warningMinimumEstimateOption]
          : gasOptions?.gasPrice,
      );
      const higherValue = new BigNumber(
        gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
          ? gasOptions?.high
          : gasOptions?.gasPrice,
      ).multipliedBy(new BigNumber(1.5));

      const valueBN = new BigNumber(value);

      if (!lowerValue.isNaN() && valueBN.lt(lowerValue)) {
        setGasPriceError(strings('edit_gas_fee_eip1559.gas_price_low'));
      } else if (!higherValue.isNaN() && valueBN.gt(higherValue)) {
        setGasPriceError(strings('edit_gas_fee_eip1559.gas_price_high'));
      } else {
        setGasPriceError('');
      }

      const newGas = { ...gasTransaction, suggestedGasPrice: value };

      changeGas(newGas, null);
    },
    [
      changeGas,
      gasEstimateType,
      gasTransaction,
      gasOptions,
      warningMinimumEstimateOption,
    ],
  );

  const changedGasLimit = useCallback(
    (value: string) => {
      const newGas = { ...gasTransaction, suggestedGasLimit: value };
      changeGas(newGas, null);
    },
    [changeGas, gasTransaction],
  );

  const selectOption = useCallback(
    (option: string) => {
      setGasPriceError('');
      changeGas({ suggestedGasPrice: gasOptions[option] }, option);
    },
    [changeGas, gasOptions],
  );

  const shouldIgnore = useCallback(
    (option) => ignoreOptions.find((item) => item === option),
    [ignoreOptions],
  );

  const renderOptions = useMemo(
    () =>
      [
        {
          name: AppConstants.GAS_OPTIONS.LOW,
          label: strings('edit_gas_fee_eip1559.low'),
        },
        {
          name: AppConstants.GAS_OPTIONS.MEDIUM,
          label: strings('edit_gas_fee_eip1559.medium'),
        },
        {
          name: AppConstants.GAS_OPTIONS.HIGH,
          label: strings('edit_gas_fee_eip1559.high'),
        },
      ]
        .filter(({ name }) => !shouldIgnore(name))
        .map(({ name, label, ...option }) => ({
          name,
          label: (selectedValue: string, disabled: boolean) => (
            <Text bold primary={selectedValue && !disabled}>
              {label}
            </Text>
          ),
          topLabel: recommended?.name === name && recommended.render,
          ...option,
          ...extendOptions[name],
        })),
    [recommended, extendOptions, shouldIgnore],
  );

  const renderWarning = useMemo(() => {
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
          style={styles.warningContainer}
        >
          {() => (
            <View style={styles.warningTextContainer}>
              <Text black style={styles.warningText}>
                {warning}
              </Text>
            </View>
          )}
        </Alert>
      );

    return warning;
  }, [warning, styles, colors]);

  const renderError = useMemo(() => {
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
          style={styles.warningContainer}
        >
          {() => (
            <View style={styles.warningTextContainer}>
              <Text red style={styles.warningText}>
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

  return (
    <View style={styles.root}>
      <ScrollView style={styles.wrapper}>
        <TouchableWithoutFeedback>
          <View>
            <View>
              <View style={styles.customGasHeader}>
                <TouchableOpacity onPress={onCancel}>
                  <Icon
                    name={'ios-arrow-back'}
                    size={24}
                    color={colors.text.default}
                  />
                </TouchableOpacity>
                <Text bold black>
                  {strings('transaction.edit_network_fee')}
                </Text>
                <Icon
                  name={'ios-arrow-back'}
                  size={24}
                  color={colors.background.default}
                />
              </View>
            </View>
            {renderWarning}
            {renderError}
            <FadeAnimationView
              valueToWatch={valueToWatch}
              animateOnChange={animateOnChange}
              onAnimationStart={onUpdatingValuesStart}
              onAnimationEnd={onUpdatingValuesEnd}
            >
              <View style={styles.headerContainer}>
                <View style={styles.headerTitle}>
                  <View style={styles.headerTitleSide}>
                    <Text right black style={styles.headerText}>
                      ~
                    </Text>
                  </View>
                  <Text black style={styles.headerText}>
                    {gasFeePrimary}
                  </Text>
                  <View style={styles.headerTitleSide} />
                </View>
                <Text big black>
                  <Text bold black>
                    {gasFeeSecondary}
                  </Text>
                </Text>
              </View>
              {!onlyAdvanced && (
                <View>
                  <HorizontalSelector
                    selected={selectedOption}
                    onPress={selectOption}
                    options={renderOptions}
                  />
                </View>
              )}
              <View style={styles.advancedOptionsContainer}>
                {!onlyAdvanced && (
                  <TouchableOpacity
                    onPress={toggleAdvancedOptions}
                    style={styles.advancedOptionsButton}
                  >
                    <Text noMargin link bold>
                      {strings('edit_gas_fee_eip1559.advanced_options')}
                    </Text>
                    <Text noMargin link bold style={styles.advancedOptionsIcon}>
                      <Icon
                        name={`ios-arrow-${
                          showAdvancedOptions ? 'up' : 'down'
                        }`}
                      />
                    </Text>
                  </TouchableOpacity>
                )}
                {showAdvancedOptions && (
                  <View style={styles.advancedOptionsInputsContainer}>
                    <View style={styles.rangeInputContainer}>
                      <RangeInput
                        leftLabelComponent={
                          <View style={styles.labelTextContainer}>
                            <Text black bold noMargin>
                              {strings('edit_gas_fee_eip1559.gas_limit')}{' '}
                            </Text>

                            <TouchableOpacity
                              hitSlop={styles.hitSlop}
                              onPress={() => setShowRangeInfoModal('gas_limit')}
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
                            <Text black bold noMargin>
                              {strings('edit_gas_fee_eip1559.gas_price')}{' '}
                            </Text>

                            <TouchableOpacity
                              hitSlop={styles.hitSlop}
                              onPress={() => setShowRangeInfoModal('gas_price')}
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
                        unit={'GWEI'}
                        increment={GAS_PRICE_INCREMENT}
                        min={GAS_PRICE_MIN}
                        inputInsideLabel={
                          transactionFeeFiat && `≈ ${transactionFeeFiat}`
                        }
                        onChangeValue={changedGasPrice}
                        error={gasPriceError}
                      />
                    </View>
                  </View>
                )}
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
            <InfoModal
              isVisible={Boolean(showRangeInfoModal)}
              title={
                showRangeInfoModal === 'gas_limit'
                  ? strings('edit_gas_fee_eip1559.gas_limit')
                  : showRangeInfoModal === 'gas_price'
                  ? strings('edit_gas_fee_eip1559.gas_price')
                  : null
              }
              toggleModal={() => setShowRangeInfoModal(null)}
              body={
                <View>
                  <Text grey infoModal>
                    {showRangeInfoModal === 'gas_limit' &&
                      strings(
                        'edit_gas_fee_eip1559.learn_more_gas_limit_legacy',
                      )}
                    {showRangeInfoModal === 'gas_price' &&
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

EditGasFeeLegacy.defaultProps = {
  ignoreOptions: [],
  warningMinimumEstimateOption: AppConstants.GAS_OPTIONS.LOW,
};

export default EditGasFeeLegacy;
