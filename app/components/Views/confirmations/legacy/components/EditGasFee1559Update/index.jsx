/* eslint-disable react/prop-types */
/* eslint-disable react/no-unstable-nested-components */
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
import { EditGasViewSelectorsIDs } from '../../../../../../../e2e/selectors/SendFlow/EditGasView.selectors.js';
import { strings } from '../../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import AppConstants from '../../../../../../core/AppConstants';
import { useGasTransaction } from '../../../../../../core/GasPolling/GasPolling';
import {
  GAS_PRICE_INCREMENT as GAS_INCREMENT,
  GAS_LIMIT_INCREMENT,
  GAS_LIMIT_MIN,
  GAS_PRICE_MIN as GAS_MIN,
} from '../../../../../../util/gasUtils';
import {
  getDecimalChainId,
  isMainnetByChainId,
} from '../../../../../../util/networks';
import {
  mockTheme,
  useAppThemeFromContext,
} from '../../../../../../util/theme';
import Alert, { AlertType } from '../../../../../Base/Alert';
import useModalHandler from '../../../../../Base/hooks/useModalHandler';
import HorizontalSelector from '../../../../../Base/HorizontalSelector';
import RangeInput from '../../../../../Base/RangeInput';
import Text from '../../../../../Base/Text';
import { useMetrics } from '../../../../../hooks/useMetrics';
import FadeAnimationView from '../../../../../UI/FadeAnimationView';
import StyledButton from '../../../../../UI/StyledButton';
import InfoModal from '../../../../../Base/InfoModal';
import TimeEstimateInfoModal from '../../../../../UI/TimeEstimateInfoModal';
import createStyles from './styles';

const EditGasFee1559Update = ({
  selectedGasValue,
  gasOptions,
  primaryCurrency,
  chainId,
  onCancel,
  onChange,
  onSave,
  error,
  dappSuggestedGas,
  ignoreOptions,
  updateOption,
  extendOptions = {},
  recommended,
  warningMinimumEstimateOption,
  suggestedEstimateOption,
  animateOnChange,
  isAnimating,
  analyticsParams,
  warning,
  selectedGasObject,
  onlyGas,
}) => {
  const [modalInfo, updateModalInfo] = useState({
    isVisible: false,
    value: '',
  });
  const [showAdvancedOptions, setShowAdvancedOptions] =
    useState(!selectedGasValue);
  const [maxPriorityFeeError, setMaxPriorityFeeError] = useState('');
  const [maxFeeError, setMaxFeeError] = useState('');
  const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState(selectedGasValue);
  const [showInputs, setShowInputs] = useState(!dappSuggestedGas);
  const [gasObject, updateGasObject] = useState({
    suggestedMaxFeePerGas: selectedGasObject.suggestedMaxFeePerGas,
    suggestedMaxPriorityFeePerGas:
      selectedGasObject.suggestedMaxPriorityFeePerGas,
    suggestedGasLimit: selectedGasObject.suggestedGasLimit,
  });

  const [
    isVisibleTimeEstimateInfoModal,
    showTimeEstimateInfoModal,
    hideTimeEstimateInfoModal,
  ] = useModalHandler(false);
  const { colors } = useAppThemeFromContext() || mockTheme;
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);

  const gasTransaction = useGasTransaction({
    onlyGas,
    gasSelected: selectedOption,
    legacy: false,
    gasObject,
  });

  const {
    renderableGasFeeMinNative,
    renderableGasFeeMaxNative,
    renderableGasFeeMaxConversion,
    renderableMaxFeePerGasNative,
    renderableGasFeeMinConversion,
    renderableMaxPriorityFeeNative,
    renderableMaxFeePerGasConversion,
    renderableMaxPriorityFeeConversion,
    timeEstimateColor,
    timeEstimate,
    timeEstimateId,
    suggestedMaxFeePerGas,
    suggestedMaxPriorityFeePerGas,
    suggestedGasLimit,
  } = gasTransaction;

  const getAnalyticsParams = useCallback(() => {
    try {
      return {
        ...analyticsParams,
        chain_id: getDecimalChainId(chainId),
        function_type: analyticsParams.view,
        gas_mode: selectedOption ? 'Basic' : 'Advanced',
        speed_set: selectedOption || undefined,
      };
    } catch (err) {
      return {};
    }
  }, [analyticsParams, chainId, selectedOption]);

  const toggleAdvancedOptions = useCallback(() => {
    if (!showAdvancedOptions) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.GAS_ADVANCED_OPTIONS_CLICKED)
          .addProperties(getAnalyticsParams())
          .build(),
      );
    }
    setShowAdvancedOptions(!showAdvancedOptions);
  }, [getAnalyticsParams, showAdvancedOptions, trackEvent, createEventBuilder]);

  const toggleLearnMoreModal = useCallback(() => {
    setShowLearnMoreModal(!showLearnMoreModal);
  }, [showLearnMoreModal]);

  const toggleInfoModal = useCallback(
    (value) => {
      updateModalInfo({ isVisible: !modalInfo.isVisible, value });
    },
    [updateModalInfo, modalInfo.isVisible],
  );

  const save = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.GAS_FEE_CHANGED)
        .addProperties(getAnalyticsParams())
        .build(),
    );

    const newGasPriceObject = {
      suggestedMaxFeePerGas: gasObject?.suggestedMaxFeePerGas,
      suggestedMaxPriorityFeePerGas: gasObject?.suggestedMaxPriorityFeePerGas,
      suggestedGasLimit: gasObject?.suggestedGasLimit,
    };

    onSave(gasTransaction, newGasPriceObject);
  }, [
    getAnalyticsParams,
    onSave,
    gasTransaction,
    gasObject,
    trackEvent,
    createEventBuilder,
  ]);

  const changeGas = useCallback(
    (gas, option) => {
      setSelectedOption(option);
      updateGasObject({
        ...gasObject,
        suggestedMaxFeePerGas: gas.suggestedMaxFeePerGas,
        suggestedMaxPriorityFeePerGas: gas.suggestedMaxPriorityFeePerGas,
        suggestedGasLimit: gas.suggestedGasLimit || gasObject.suggestedGasLimit,
      });
      onChange(option);
    },
    [onChange, gasObject],
  );

  const changedGasLimit = useCallback(
    (value) => {
      const newGas = { ...gasTransaction, suggestedGasLimit: value };
      changeGas(newGas, null);
    },
    [changeGas, gasTransaction],
  );

  const changedMaxPriorityFee = useCallback(
    (value) => {
      const lowerValue = new BigNumber(
        gasOptions?.[
          warningMinimumEstimateOption
        ]?.suggestedMaxPriorityFeePerGas,
      );

      const higherValue = new BigNumber(
        gasOptions?.high?.suggestedMaxPriorityFeePerGas,
      ).multipliedBy(new BigNumber(1.5));
      const updateFloor = new BigNumber(updateOption?.maxPriortyFeeThreshold);

      const valueBN = new BigNumber(value);

      if (updateFloor && !updateFloor.isNaN() && valueBN.lt(updateFloor)) {
        setMaxPriorityFeeError(
          updateOption?.isCancel
            ? strings('edit_gas_fee_eip1559.max_priority_fee_cancel_low', {
                cancel_value: updateFloor,
              })
            : strings('edit_gas_fee_eip1559.max_priority_fee_speed_up_low', {
                speed_up_floor_value: updateFloor,
              }),
        );
      } else if (!lowerValue.isNaN() && valueBN.lt(lowerValue)) {
        setMaxPriorityFeeError(
          strings('edit_gas_fee_eip1559.max_priority_fee_low'),
        );
      } else if (!higherValue.isNaN() && valueBN.gt(higherValue)) {
        setMaxPriorityFeeError(
          strings('edit_gas_fee_eip1559.max_priority_fee_high'),
        );
      } else {
        setMaxPriorityFeeError(null);
      }

      const newGas = {
        ...gasTransaction,
        suggestedMaxPriorityFeePerGas: value,
      };

      changeGas(newGas, null);
    },
    [
      changeGas,
      gasTransaction,
      gasOptions,
      updateOption,
      warningMinimumEstimateOption,
    ],
  );

  const changedMaxFeePerGas = useCallback(
    (value) => {
      const lowerValue = new BigNumber(
        gasOptions?.[warningMinimumEstimateOption]?.suggestedMaxFeePerGas,
      );
      const higherValue = new BigNumber(
        gasOptions?.high?.suggestedMaxFeePerGas,
      ).multipliedBy(new BigNumber(1.5));
      const updateFloor = new BigNumber(updateOption?.maxFeeThreshold);

      const valueBN = new BigNumber(value);

      if (updateFloor && !updateFloor.isNaN() && valueBN.lt(updateFloor)) {
        setMaxFeeError(
          updateOption?.isCancel
            ? strings('edit_gas_fee_eip1559.max_fee_cancel_low', {
                cancel_value: updateFloor,
              })
            : strings('edit_gas_fee_eip1559.max_fee_speed_up_low', {
                speed_up_floor_value: updateFloor,
              }),
        );
      } else if (!lowerValue.isNaN() && valueBN.lt(lowerValue)) {
        setMaxFeeError(strings('edit_gas_fee_eip1559.max_fee_low'));
      } else if (!higherValue.isNaN() && valueBN.gt(higherValue)) {
        setMaxFeeError(strings('edit_gas_fee_eip1559.max_fee_high'));
      } else {
        setMaxFeeError('');
      }

      const newGas = {
        ...gasTransaction,
        suggestedMaxFeePerGas: value,
      };

      changeGas(newGas, null);
    },
    [
      changeGas,
      gasTransaction,
      gasOptions,
      updateOption,
      warningMinimumEstimateOption,
    ],
  );

  const selectOption = useCallback(
    (option) => {
      setSelectedOption(option);
      setMaxFeeError('');
      setMaxPriorityFeeError('');
      changeGas({ ...gasOptions?.[option] }, option);
    },
    [changeGas, gasOptions],
  );

  const shouldIgnore = useCallback(
    (option) => ignoreOptions?.find((item) => item === option),
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
          label: strings('edit_gas_fee_eip1559.market'),
        },
        {
          name: AppConstants.GAS_OPTIONS.HIGH,
          label: strings('edit_gas_fee_eip1559.aggressive'),
        },
      ]
        .filter(({ name }) => !shouldIgnore(name))
        .map(({ name, label, ...option }) => ({
          name,
          label: function LabelComponent(selected, disabled) {
            return (
              <Text bold primary={selected && !disabled}>
                {label}
              </Text>
            );
          },
          topLabel: recommended?.name === name && recommended.render,
          ...option,
          ...extendOptions[name],
        })),
    [recommended, extendOptions, shouldIgnore],
  );

  const isMainnet = isMainnetByChainId(chainId);
  const nativeCurrencySelected = primaryCurrency === 'ETH' || !isMainnet;

  const switchNativeCurrencyDisplayOptions = (nativeValue, fiatValue) => {
    if (nativeCurrencySelected) return nativeValue;
    return fiatValue;
  };

  const valueToWatch = `${renderableGasFeeMinNative}${renderableGasFeeMaxNative}`;

  const LeftLabelComponent = ({ value, infoValue }) => (
    <View style={styles.labelTextContainer}>
      <Text black bold noMargin>
        {strings(value)}
      </Text>
      <TouchableOpacity
        hitSlop={styles.hitSlop}
        onPress={() => toggleInfoModal(infoValue)}
      >
        <MaterialCommunityIcon
          name="information"
          size={14}
          style={styles.labelInfo}
        />
      </TouchableOpacity>
    </View>
  );

  const RightLabelComponent = ({ value }) => (
    <Text noMargin small grey>
      <Text bold reset>
        {strings(value)}:
      </Text>{' '}
      {gasOptions?.[suggestedEstimateOption]?.suggestedMaxFeePerGas} GWEI
    </Text>
  );

  const TextComponent = ({ title, value }) => (
    <>
      <Text noMargin primary infoModal bold style={styles.learnMoreLabels}>
        {strings(title)}
      </Text>
      <Text noMargin grey infoModal>
        {strings(value)}
      </Text>
    </>
  );

  const renderInputs = (option) => (
    <View>
      <FadeAnimationView
        valueToWatch={valueToWatch}
        animateOnChange={animateOnChange}
      >
        <View>
          <HorizontalSelector
            selected={selectedOption}
            onPress={selectOption}
            options={renderOptions}
          />
        </View>
        <View style={styles.advancedOptionsContainer}>
          <TouchableOpacity
            disabled={option?.showAdvanced}
            onPress={toggleAdvancedOptions}
            style={styles.advancedOptionsButton}
          >
            <Text noMargin link bold>
              {strings('edit_gas_fee_eip1559.advanced_options')}
            </Text>
            <Text noMargin link bold style={styles.advancedOptionsIcon}>
              <Icon name={`arrow-${showAdvancedOptions ? 'up' : 'down'}`} />
            </Text>
          </TouchableOpacity>
          {(showAdvancedOptions || option?.maxFeeThreshold) && (
            <View style={styles.advancedOptionsInputsContainer}>
              <View style={styles.rangeInputContainer}>
                <RangeInput
                  leftLabelComponent={
                    <LeftLabelComponent
                      value="edit_gas_fee_eip1559.gas_limit"
                      infoValue="gas_limit"
                    />
                  }
                  min={GAS_LIMIT_MIN}
                  value={suggestedGasLimit}
                  onChangeValue={changedGasLimit}
                  name={strings('edit_gas_fee_eip1559.gas_limit')}
                  increment={GAS_LIMIT_INCREMENT}
                />
              </View>
              <View
                style={styles.rangeInputContainer}
                testID={EditGasViewSelectorsIDs.MAX_PRIORITY_FEE_INPUT_TEST_ID}
              >
                <RangeInput
                  leftLabelComponent={
                    <LeftLabelComponent
                      value="edit_gas_fee_eip1559.max_priority_fee"
                      infoValue="max_priority_fee"
                    />
                  }
                  rightLabelComponent={
                    <RightLabelComponent value="edit_gas_fee_eip1559.estimate" />
                  }
                  value={suggestedMaxPriorityFeePerGas}
                  name={strings('edit_gas_fee_eip1559.max_priority_fee')}
                  unit={'GWEI'}
                  min={GAS_MIN}
                  increment={GAS_INCREMENT}
                  inputInsideLabel={
                    renderableMaxPriorityFeeNative &&
                    `≈ ${switchNativeCurrencyDisplayOptions(
                      renderableMaxPriorityFeeNative,
                      renderableMaxPriorityFeeConversion,
                    )}`
                  }
                  error={maxPriorityFeeError}
                  onChangeValue={changedMaxPriorityFee}
                />
              </View>
              <View style={styles.rangeInputContainer}>
                <RangeInput
                  leftLabelComponent={
                    <LeftLabelComponent
                      value="edit_gas_fee_eip1559.max_fee"
                      infoValue="max_fee"
                    />
                  }
                  rightLabelComponent={
                    <RightLabelComponent value="edit_gas_fee_eip1559.estimate" />
                  }
                  value={suggestedMaxFeePerGas}
                  name={strings('edit_gas_fee_eip1559.max_fee')}
                  unit={'GWEI'}
                  min={GAS_MIN}
                  increment={GAS_INCREMENT}
                  error={maxFeeError}
                  onChangeValue={changedMaxFeePerGas}
                  inputInsideLabel={
                    renderableMaxFeePerGasNative &&
                    `≈ ${switchNativeCurrencyDisplayOptions(
                      renderableMaxFeePerGasNative,
                      renderableMaxFeePerGasConversion,
                    )}`
                  }
                />
              </View>
            </View>
          )}
        </View>
      </FadeAnimationView>
      <View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={toggleLearnMoreModal}
        >
          <Text link centered>
            {strings('edit_gas_fee_eip1559.learn_more.title')}
          </Text>
        </TouchableOpacity>
        <StyledButton
          type={'confirm'}
          onPress={save}
          disabled={Boolean(error) || isAnimating}
        >
          {option
            ? strings('edit_gas_fee_eip1559.submit')
            : strings('edit_gas_fee_eip1559.save')}
        </StyledButton>
      </View>
    </View>
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

  const renderDisplayTitle = useMemo(() => {
    if (updateOption)
      return updateOption.isCancel
        ? strings('edit_gas_fee_eip1559.cancel_transaction')
        : strings('edit_gas_fee_eip1559.speed_up_transaction');
    return strings('edit_gas_fee_eip1559.edit_priority');
  }, [updateOption]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.wrapper}
        testID={EditGasViewSelectorsIDs.EDIT_PRIORITY_SCREEN_TEST_ID}
      >
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
                <Text bold black>
                  {renderDisplayTitle}
                </Text>
                <Icon
                  name={'arrow-back'}
                  size={24}
                  color={colors.background.default}
                />
              </View>
              {updateOption && (
                <View style={styles.newGasFeeHeader}>
                  <Text black bold noMargin>
                    {strings('edit_gas_fee_eip1559.new_gas_fee')}{' '}
                  </Text>

                  <TouchableOpacity
                    hitSlop={styles.hitSlop}
                    onPress={() => toggleInfoModal('new_gas_fee')}
                  >
                    <MaterialCommunityIcon
                      name="information"
                      size={14}
                      style={styles.labelInfo}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {renderWarning}
            {renderError}
            <FadeAnimationView
              style={styles.headerContainer}
              valueToWatch={valueToWatch}
              animateOnChange={animateOnChange}
            >
              <View style={styles.headerTitle}>
                <Text
                  black
                  style={styles.headerText}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  noMargin
                >
                  ~
                  {switchNativeCurrencyDisplayOptions(
                    renderableGasFeeMinNative,
                    renderableGasFeeMinConversion,
                  )}
                </Text>
              </View>
              <Text big black style={styles.subheader} noMargin>
                <Text bold black noMargin>
                  {strings('edit_gas_fee_eip1559.max_fee')}:{' '}
                </Text>
                {switchNativeCurrencyDisplayOptions(
                  renderableGasFeeMaxNative,
                  renderableGasFeeMaxConversion,
                )}{' '}
                (
                {switchNativeCurrencyDisplayOptions(
                  renderableGasFeeMaxConversion,
                  renderableGasFeeMaxNative,
                )}
                )
              </Text>
              <View style={styles.labelTextContainer}>
                <Text
                  green={
                    timeEstimateColor === 'green' ||
                    timeEstimateId === AppConstants.GAS_TIMES.VERY_LIKELY
                  }
                  red={timeEstimateColor === 'red'}
                  bold
                >
                  {timeEstimate}
                </Text>
                {timeEstimateId ===
                  (AppConstants.GAS_TIMES.MAYBE ||
                    AppConstants.GAS_TIMES.UNKNOWN) && (
                  <TouchableOpacity
                    hitSlop={styles.hitSlop}
                    onPress={() => showTimeEstimateInfoModal()}
                  >
                    <MaterialCommunityIcon
                      name="information"
                      size={14}
                      style={styles.redInfo}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </FadeAnimationView>
            {!showInputs ? (
              <View style={styles.dappEditGasContainer}>
                <StyledButton
                  type={'orange'}
                  onPress={() => setShowInputs(true)}
                >
                  {strings('edit_gas_fee_eip1559.edit_suggested_gas_fee')}
                </StyledButton>
              </View>
            ) : (
              renderInputs(updateOption)
            )}

            <InfoModal
              isVisible={Boolean(modalInfo.isVisible)}
              title={
                modalInfo.value === 'gas_limit'
                  ? strings('edit_gas_fee_eip1559.gas_limit')
                  : modalInfo.value === 'max_priority_fee'
                    ? strings('edit_gas_fee_eip1559.max_priority_fee')
                    : modalInfo.value === 'max_fee'
                      ? strings('edit_gas_fee_eip1559.max_fee')
                      : modalInfo.value === 'new_gas_fee'
                        ? strings('edit_gas_fee_eip1559.new_gas_fee')
                        : null
              }
              toggleModal={() =>
                updateModalInfo({ ...modalInfo, isVisible: false })
              }
              body={
                <View>
                  <Text grey infoModal>
                    {modalInfo.value === 'gas_limit' &&
                      strings('edit_gas_fee_eip1559.learn_more_gas_limit')}
                    {modalInfo.value === 'max_priority_fee' &&
                      strings(
                        'edit_gas_fee_eip1559.learn_more_max_priority_fee',
                      )}
                    {modalInfo.value === 'max_fee' &&
                      strings('edit_gas_fee_eip1559.learn_more_max_fee')}
                    {modalInfo.value === 'new_gas_fee' && updateOption?.isCancel
                      ? strings(
                          'edit_gas_fee_eip1559.learn_more_cancel_gas_fee',
                        )
                      : strings('edit_gas_fee_eip1559.learn_more_new_gas_fee')}
                  </Text>
                </View>
              }
            />
            <InfoModal
              isVisible={showLearnMoreModal}
              title={strings('edit_gas_fee_eip1559.learn_more.title')}
              toggleModal={toggleLearnMoreModal}
              propagateSwipe
              body={
                <View style={styles.learnMoreModal}>
                  <ScrollView>
                    <TouchableWithoutFeedback>
                      <View>
                        <Text noMargin grey infoModal>
                          {strings('edit_gas_fee_eip1559.learn_more.intro')}
                        </Text>
                        <TextComponent
                          title="edit_gas_fee_eip1559.learn_more.low_label"
                          value="edit_gas_fee_eip1559.learn_more.low_text"
                        />
                        <TextComponent
                          title="edit_gas_fee_eip1559.learn_more.market_label"
                          value="edit_gas_fee_eip1559.learn_more.market_text"
                        />
                        <TextComponent
                          title="edit_gas_fee_eip1559.learn_more.aggressive_label"
                          value="edit_gas_fee_eip1559.learn_more.aggressive_text"
                        />
                      </View>
                    </TouchableWithoutFeedback>
                  </ScrollView>
                </View>
              }
            />
            <TimeEstimateInfoModal
              isVisible={isVisibleTimeEstimateInfoModal}
              timeEstimateId={timeEstimateId}
              onHideModal={hideTimeEstimateInfoModal}
            />
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  );
};

export default EditGasFee1559Update;
