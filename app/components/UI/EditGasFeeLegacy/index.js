/* eslint-disable react/display-name */
import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import PropTypes from 'prop-types';
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
import Device from '../../../util/device';
import { isMainnetByChainId } from '../../../util/networks';
import FadeAnimationView from '../FadeAnimationView';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import AppConstants from '../../../core/AppConstants';
import { useTheme } from '../../../util/theme';

const GAS_LIMIT_INCREMENT = new BigNumber(1000);
const GAS_PRICE_INCREMENT = new BigNumber(1);
const GAS_LIMIT_MIN = new BigNumber(21000);
const GAS_PRICE_MIN = new BigNumber(0);

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 200,
      maxHeight: '95%',
      paddingTop: 24,
      paddingBottom: Device.isIphoneX() ? 32 : 24,
    },
    wrapper: {
      paddingHorizontal: 24,
    },
    customGasHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingBottom: 20,
    },
    headerContainer: {
      alignItems: 'center',
      marginBottom: 22,
    },
    headerText: {
      fontSize: 48,
    },
    headerTitle: {
      flexDirection: 'row',
    },
    headerTitleSide: {
      flex: 1,
    },
    labelTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    hitSlop: {
      top: 10,
      left: 10,
      bottom: 10,
      right: 10,
    },
    labelInfo: {
      color: colors.text.muted,
    },
    advancedOptionsContainer: {
      marginTop: 25,
      marginBottom: 30,
    },
    advancedOptionsInputsContainer: {
      marginTop: 14,
    },
    rangeInputContainer: {
      marginBottom: 20,
    },
    advancedOptionsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    advancedOptionsIcon: {
      paddingTop: 1,
      marginLeft: 5,
    },
    warningTextContainer: {
      paddingLeft: 4,
      lineHeight: 20,
      textAlign: 'center',
    },
    warningText: {
      lineHeight: 20,
      color: colors.text.default,
    },
  });

/**
 * The EditGasFeeLegacy component will be deprecated in favor of EditGasFeeLegacyUpdate as part of the gas polling refactor code that moves gas fee modifications to `app/core/GasPolling`. When the refactoring is completed, the EditGasFeeLegacyUpdate will be renamed EditGasFeeLegacy and this component will be removed. The EditGasFeeLegacyUpdate is currently being used in the Update Transaction(Speed Up/Cancel) flow.
 */

const EditGasFeeLegacy = ({
  selected,
  gasFee,
  gasOptions,
  onChange,
  onCancel,
  onSave,
  gasFeeNative,
  gasFeeConversion,
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
}) => {
  const onlyAdvanced = gasEstimateType !== GAS_ESTIMATE_TYPES.LEGACY;
  const [showRangeInfoModal, setShowRangeInfoModal] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(
    !selected || onlyAdvanced,
  );
  const [selectedOption, setSelectedOption] = useState(selected);
  const [gasPriceError, setGasPriceError] = useState();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const getAnalyticsParams = useCallback(() => {
    try {
      return {
        ...analyticsParams,
        chain_id: chainId,
        function_type: view,
        gas_mode: selectedOption ? 'Basic' : 'Advanced',
        speed_set: selectedOption || undefined,
      };
    } catch (error) {
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
    setShowAdvancedOptions((showAdvancedOptions) => !showAdvancedOptions);
  }, [getAnalyticsParams, showAdvancedOptions]);

  const save = useCallback(() => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.GAS_FEE_CHANGED,
      getAnalyticsParams(),
    );

    onSave(selectedOption);
  }, [getAnalyticsParams, onSave, selectedOption]);

  const changeGas = useCallback(
    (gas, selectedOption) => {
      setSelectedOption(selectedOption);
      onChange(gas, selectedOption);
    },
    [onChange],
  );

  const changedGasPrice = useCallback(
    (value) => {
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

      const newGas = { ...gasFee, suggestedGasPrice: value };

      changeGas(newGas, null);
    },
    [
      changeGas,
      gasEstimateType,
      gasFee,
      gasOptions,
      warningMinimumEstimateOption,
    ],
  );

  const changedGasLimit = useCallback(
    (value) => {
      const newGas = { ...gasFee, suggestedGasLimit: value };

      changeGas(newGas, null);
    },
    [changeGas, gasFee],
  );

  const selectOption = useCallback(
    (option) => {
      setGasPriceError('');
      setSelectedOption(option);
      changeGas({ ...gasFee, suggestedGasPrice: gasOptions[option] }, option);
    },
    [changeGas, gasFee, gasOptions],
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
          label: (selected, disabled) => (
            <Text bold primary={selected && !disabled}>
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

  const isMainnet = isMainnetByChainId(chainId);
  const nativeCurrencySelected = primaryCurrency === 'ETH' || !isMainnet;
  let gasFeePrimary, gasFeeSecondary;
  if (nativeCurrencySelected) {
    gasFeePrimary = gasFeeNative;
    gasFeeSecondary = gasFeeConversion;
  } else {
    gasFeePrimary = gasFeeConversion;
    gasFeeSecondary = gasFeeNative;
  }

  const valueToWatch = gasFeeNative;

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
                        value={gasFee.suggestedGasLimit}
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
                        value={gasFee.suggestedGasPrice}
                        name={strings('edit_gas_fee_eip1559.gas_price')}
                        unit={'GWEI'}
                        increment={GAS_PRICE_INCREMENT}
                        min={GAS_PRICE_MIN}
                        inputInsideLabel={
                          gasFeeConversion && `≈ ${gasFeeConversion}`
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

EditGasFeeLegacy.propTypes = {
  /**
   * Gas option selected (low, medium, high)
   */
  selected: PropTypes.string,
  /**
   * Gas fee currently active
   */
  gasFee: PropTypes.object,
  /**
   * Gas fee options to select from
   */
  gasOptions: PropTypes.object,
  /**
   * Function called when user selected or changed the gas
   */
  onChange: PropTypes.func,
  /**
   * Function called when user cancels
   */
  onCancel: PropTypes.func,
  /**
   * Function called when user saves the new gas
   */
  onSave: PropTypes.func,
  /**
   * Gas fee in native currency
   */
  gasFeeNative: PropTypes.string,
  /**
   * Gas fee converted to chosen currency
   */
  gasFeeConversion: PropTypes.string,
  /**
   * Primary currency, either ETH or Fiat
   */
  primaryCurrency: PropTypes.string,
  /**
   * A string representing the network chainId
   */
  chainId: PropTypes.string,
  /**
   * Estimate type returned by the gas fee controller, can be market-fee, legacy or eth_gasPrice
   */
  gasEstimateType: PropTypes.string,
  /**
   * Error message to show
   */
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
    PropTypes.node,
  ]),
  /**
   * Warning message to show
   */
  warning: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
    PropTypes.node,
  ]),
  /**
   * Ignore option array
   */
  ignoreOptions: PropTypes.array,
  /**
   * Extend options object. Object has option keys and properties will be spread
   */
  extendOptions: PropTypes.object,
  /**
   * Recommended object with type and render function
   */
  recommended: PropTypes.object,
  /**
   * Estimate option to compare with for too low warning
   */
  warningMinimumEstimateOption: PropTypes.string,
  /**
   * Function to call when update animation starts
   */
  onUpdatingValuesStart: PropTypes.func,
  /**
   * Function to call when update animation ends
   */
  onUpdatingValuesEnd: PropTypes.func,
  /**
   * If the values should animate upon update or not
   */
  animateOnChange: PropTypes.bool,
  /**
   * Boolean to determine if the animation is happening
   */
  isAnimating: PropTypes.bool,
  /**
   * Extra analytics params to be send with the gas analytics
   */
  analyticsParams: PropTypes.object,
  /**
   * (For analytics purposes) View (Approve, Transfer, Confirm) where this component is being used
   */
  view: PropTypes.string.isRequired,
};

export default EditGasFeeLegacy;
