/* eslint-disable react/display-name */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import Text from '../../Base/Text';
import StyledButton from '../StyledButton';
import RangeInput from '../../Base/RangeInput';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../styles/common';
import InfoModal from '../Swaps/components/InfoModal';
import Icon from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../locales/i18n';
import Alert from '../../Base/Alert';
import HorizontalSelector from '../../Base/HorizontalSelector';
import Device from '../../../util/Device';
import { isMainnetByChainId } from '../../../util/networks';
import PropTypes from 'prop-types';
import BigNumber from 'bignumber.js';

const GAS_LIMIT_INCREMENT = new BigNumber(1000);
const GAS_INCREMENT = new BigNumber(1);
const GAS_LIMIT_MIN = new BigNumber(21000);
const GAS_MIN = new BigNumber(1);

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		borderRadius: 20,
		minHeight: 200,
		maxHeight: '95%',
		paddingTop: 24,
		paddingBottom: Device.isIphoneX() ? 32 : 24
	},
	wrapper: {
		paddingHorizontal: 24
	},
	customGasHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
		paddingBottom: 20
	},
	headerContainer: {
		alignItems: 'center',
		marginBottom: 22
	},
	headerText: {
		fontSize: 48,
		flex: 1,
		textAlign: 'center'
	},
	headerTitle: {
		flexDirection: 'row'
	},
	saveButton: {
		marginBottom: 20
	},
	labelTextContainer: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	},
	labelInfo: {
		color: colors.grey200
	},
	advancedOptionsContainer: {
		marginTop: 25,
		marginBottom: 30
	},
	advancedOptionsInputsContainer: {
		marginTop: 14
	},
	rangeInputContainer: {
		marginBottom: 20
	},
	advancedOptionsButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	advancedOptionsIcon: {
		paddingTop: 1,
		marginLeft: 5
	},
	learnMoreLabels: {
		marginTop: 9
	},
	learnMoreLink: {
		marginTop: 14
	},
	warningTextContainer: {
		lineHeight: 20,
		paddingLeft: 4
	},
	warningText: {
		lineHeight: 20
	},
	warningContainer: {
		marginBottom: 20
	},
	dappEditGasContainer: {
		marginVertical: 20
	}
});

const EditGasFee1559 = ({
	selected,
	gasFee,
	gasOptions,
	onChange,
	onCancel,
	onSave,
	gasFeeNative,
	gasFeeConversion,
	gasFeeMaxNative,
	gasFeeMaxConversion,
	maxPriorityFeeNative,
	maxPriorityFeeConversion,
	maxFeePerGasNative,
	maxFeePerGasConversion,
	primaryCurrency,
	chainId,
	timeEstimate,
	timeEstimateColor,
	error,
	warning,
	dappSuggestedGasPrice
}) => {
	const [showRangeInfoModal, setShowRangeInfoModal] = useState(false);
	const [showAdvancedOptions, setShowAdvancedOptions] = useState(!selected);
	const [maxPriorityFeeError, setMaxPriorityFeeError] = useState(null);
	const [maxFeeError, setMaxFeeError] = useState(null);
	const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);
	const [selectedOption, setSelectedOption] = useState(selected);
	const [showInputs, setShowInputs] = useState(!dappSuggestedGasPrice);

	const toggleRangeInfoModal = useCallback(() => {
		setShowRangeInfoModal(showRangeInfoModal => !showRangeInfoModal);
	}, []);

	const toggleAdvancedOptions = useCallback(() => {
		setShowAdvancedOptions(showAdvancedOptions => !showAdvancedOptions);
	}, []);

	const toggleLearnMoreModal = useCallback(() => {
		setShowLearnMoreModal(showLearnMoreModal => !showLearnMoreModal);
	}, []);

	const save = () => {
		onSave(selectedOption);
	};

	const changeGas = useCallback(
		(gas, selectedOption) => {
			setSelectedOption(selectedOption);
			onChange(gas, selectedOption);
		},
		[onChange]
	);

	const changedMaxPriorityFee = useCallback(
		value => {
			const lowerValue = new BigNumber(gasOptions?.low?.suggestedMaxPriorityFeePerGas);
			const higherValue = new BigNumber(gasOptions?.high?.suggestedMaxPriorityFeePerGas).multipliedBy(
				new BigNumber(1.5)
			);

			const valueBN = new BigNumber(value);

			if (lowerValue && valueBN.lt(lowerValue)) {
				setMaxPriorityFeeError('Max Priority Fee is low for current network conditions');
			} else if (higherValue && valueBN.gt(higherValue)) {
				setMaxPriorityFeeError('Max Priority Fee is higher than necessary');
			} else {
				setMaxPriorityFeeError('');
			}

			const newGas = { ...gasFee, suggestedMaxPriorityFeePerGas: value };

			changeGas(newGas, null);
		},
		[changeGas, gasFee, gasOptions]
	);

	const changedMaxFeePerGas = useCallback(
		value => {
			const lowerValue = new BigNumber(gasOptions?.low?.suggestedMaxFeePerGas);
			const higherValue = new BigNumber(gasOptions?.high?.suggestedMaxFeePerGas).multipliedBy(new BigNumber(1.5));

			const valueBN = new BigNumber(value);

			if (lowerValue && valueBN.lt(lowerValue)) {
				setMaxFeeError('Max Fee is low for current network conditions');
			} else if (higherValue && valueBN.gt(higherValue)) {
				setMaxFeeError('Max Fee is higher than necessary');
			} else {
				setMaxFeeError('');
			}

			const newGas = { ...gasFee, suggestedMaxFeePerGas: value };
			changeGas(newGas, null);
		},
		[changeGas, gasFee, gasOptions]
	);

	const changedGasLimit = useCallback(
		value => {
			const newGas = { ...gasFee, suggestedGasLimit: value };
			changeGas(newGas, null);
		},
		[changeGas, gasFee]
	);

	const selectOption = useCallback(
		option => {
			setSelectedOption(option);
			setMaxFeeError('');
			setMaxPriorityFeeError('');
			changeGas({ ...gasOptions[option] }, option);
		},
		[changeGas, gasOptions]
	);

	const isMainnet = isMainnetByChainId(chainId);
	const nativeCurrencySelected = primaryCurrency === 'ETH' || !isMainnet;
	let gasFeePrimary, gasFeeMaxPrimary, maxFeePerGasPrimary, maxPriorityFeePerGasPrimary, gasFeeMaxSecondary;
	if (nativeCurrencySelected) {
		gasFeePrimary = gasFeeNative;
		gasFeeMaxPrimary = gasFeeMaxNative;
		gasFeeMaxSecondary = gasFeeMaxConversion;
		maxFeePerGasPrimary = maxFeePerGasNative;
		maxPriorityFeePerGasPrimary = maxPriorityFeeNative;
	} else {
		gasFeePrimary = gasFeeConversion;
		gasFeeMaxPrimary = gasFeeMaxConversion;
		gasFeeMaxSecondary = gasFeeMaxNative;
		maxFeePerGasPrimary = maxFeePerGasConversion;
		maxPriorityFeePerGasPrimary = maxPriorityFeeConversion;
	}

	const renderInputs = () => (
		<View>
			<View>
				{/* TODO(eip1559) hook with strings i18n */}
				<HorizontalSelector
					selected={selectedOption}
					onPress={selectOption}
					options={[
						{
							name: 'low',
							label: <Text bold>Lower</Text>
						},
						{
							name: 'medium',
							label: (selected, disabled) => (
								<Text bold primary={selected && !disabled}>
									Medium
								</Text>
							),
							topLabel: (
								<TouchableOpacity onPress={toggleRangeInfoModal}>
									<Text noMargin link bold small centered>
										Recommended{' '}
										<MaterialCommunityIcon name="information" size={14} style={styles.labelInfo} />
									</Text>
								</TouchableOpacity>
							)
						},

						{
							name: 'high',
							label: (selected, disabled) => (
								<Text bold primary={selected && !disabled}>
									Higher
								</Text>
							)
						}
					]}
				/>
			</View>
			<View style={styles.advancedOptionsContainer}>
				<TouchableOpacity onPress={toggleAdvancedOptions} style={styles.advancedOptionsButton}>
					<Text noMargin link bold>
						{strings('edit_gas_fee_eip1559.advanced_options')}
					</Text>
					<Text noMargin link bold style={styles.advancedOptionsIcon}>
						<Icon name={`ios-arrow-${showAdvancedOptions ? 'up' : 'down'}`} />
					</Text>
				</TouchableOpacity>
				{showAdvancedOptions && (
					<View style={styles.advancedOptionsInputsContainer}>
						<View style={styles.rangeInputContainer}>
							<RangeInput
								leftLabelComponent={
									<View style={styles.labelTextContainer}>
										<Text black bold noMargin>
											{strings('edit_gas_fee_eip1559.gas_limit')}{' '}
										</Text>

										<TouchableOpacity hitSlop={styles.hitSlop} onPress={toggleRangeInfoModal}>
											<MaterialCommunityIcon
												name="information"
												size={14}
												style={styles.labelInfo}
											/>
										</TouchableOpacity>
									</View>
								}
								min={GAS_LIMIT_MIN}
								value={gasFee.suggestedGasLimit}
								onChangeValue={changedGasLimit}
								name={'Gas limit'}
								increment={GAS_LIMIT_INCREMENT}
							/>
						</View>
						<View style={styles.rangeInputContainer}>
							<RangeInput
								leftLabelComponent={
									<View style={styles.labelTextContainer}>
										<Text black bold noMargin>
											{strings('edit_gas_fee_eip1559.max_priority_fee')}{' '}
										</Text>

										<TouchableOpacity hitSlop={styles.hitSlop} onPress={toggleRangeInfoModal}>
											<MaterialCommunityIcon
												name="information"
												size={14}
												style={styles.labelInfo}
											/>
										</TouchableOpacity>
									</View>
								}
								rightLabelComponent={
									<Text noMargin small grey>
										<Text bold reset>
											{strings('edit_gas_fee_eip1559.estimate')}:
										</Text>{' '}
										{gasOptions?.medium?.suggestedMaxPriorityFeePerGas} GWEI
									</Text>
								}
								value={gasFee.suggestedMaxPriorityFeePerGas}
								name={strings('edit_gas_fee_eip1559.max_priority_fee')}
								unit={'GWEI'}
								min={GAS_MIN}
								increment={GAS_INCREMENT}
								inputInsideLabel={`≈ ${maxPriorityFeePerGasPrimary}`}
								error={maxPriorityFeeError}
								onChangeValue={changedMaxPriorityFee}
							/>
						</View>
						<View style={styles.rangeInputContainer}>
							<RangeInput
								leftLabelComponent={
									<View style={styles.labelTextContainer}>
										<Text black={!maxFeeError} red={Boolean(maxFeeError)} bold noMargin>
											{strings('edit_gas_fee_eip1559.max_fee')}{' '}
										</Text>

										<TouchableOpacity hitSlop={styles.hitSlop} onPress={toggleRangeInfoModal}>
											<MaterialCommunityIcon
												name="information"
												size={14}
												style={styles.labelInfo}
											/>
										</TouchableOpacity>
									</View>
								}
								rightLabelComponent={
									<Text noMargin small grey>
										<Text bold reset>
											{strings('edit_gas_fee_eip1559.estimate')}:
										</Text>{' '}
										{gasOptions?.medium?.suggestedMaxFeePerGas} GWEI
									</Text>
								}
								value={gasFee.suggestedMaxFeePerGas}
								name={strings('edit_gas_fee_eip1559.max_fee')}
								unit={'GWEI'}
								min={GAS_MIN}
								increment={GAS_INCREMENT}
								error={maxFeeError}
								onChangeValue={changedMaxFeePerGas}
								inputInsideLabel={`≈ ${maxFeePerGasPrimary}`}
							/>
						</View>
					</View>
				)}
			</View>
			<View>
				<TouchableOpacity style={styles.saveButton} onPress={toggleLearnMoreModal}>
					<Text link centered>
						{strings('edit_gas_fee_eip1559.learn_more.title')}
					</Text>
				</TouchableOpacity>
				<StyledButton type={'confirm'} onPress={save} disabled={Boolean(error)}>
					{strings('edit_gas_fee_eip1559.save')}
				</StyledButton>
			</View>
		</View>
	);

	return (
		<View style={styles.root}>
			<ScrollView style={styles.wrapper}>
				<TouchableWithoutFeedback>
					<View>
						<View>
							<View style={styles.customGasHeader}>
								<TouchableOpacity onPress={onCancel}>
									<Icon name={'ios-arrow-back'} size={24} color={colors.black} />
								</TouchableOpacity>
								<Text bold black>
									{strings('transaction.edit_network_fee')}
								</Text>
								<Icon name={'ios-arrow-back'} size={24} color={colors.white} />
							</View>
						</View>
						{!!warning && (
							<Alert
								small
								type="warning"
								renderIcon={() => (
									<MaterialCommunityIcon name="information" size={20} color={colors.yellow} />
								)}
								style={styles.warningContainer}
							>
								<View style={styles.warningTextContainer}>
									<Text black style={styles.warningText}>
										{warning}
									</Text>
								</View>
							</Alert>
						)}
						{!!error && (
							<Alert
								small
								type="error"
								renderIcon={() => (
									<MaterialCommunityIcon name="information" size={20} color={colors.red} />
								)}
								style={styles.warningContainer}
							>
								<View style={styles.warningTextContainer}>
									<Text red style={styles.warningText}>
										{error}
									</Text>
								</View>
							</Alert>
						)}

						<View style={styles.headerContainer}>
							<View style={styles.headerTitle}>
								<Text black style={styles.headerText} adjustsFontSizeToFit numberOfLines={1}>
									~{gasFeePrimary}
								</Text>
							</View>
							<Text big black>
								Up to{' '}
								<Text bold black>
									{gasFeeMaxPrimary} ({gasFeeMaxSecondary})
								</Text>
							</Text>
							<Text green={timeEstimateColor === 'green'} red={timeEstimateColor === 'red'}>
								{timeEstimate}
							</Text>
						</View>
						{!showInputs ? (
							<View style={styles.dappEditGasContainer}>
								<StyledButton type={'orange'} onPress={() => setShowInputs(true)}>
									{'Edit gas fee suggestion'}
								</StyledButton>
							</View>
						) : (
							renderInputs()
						)}
						<InfoModal
							isVisible={showRangeInfoModal}
							title={strings('edit_gas_fee_eip1559.recommended_gas_fee')}
							toggleModal={toggleRangeInfoModal}
							body={
								<View>
									<Text grey infoModal>
										{strings('edit_gas_fee_eip1559.swaps_warning')}
									</Text>
								</View>
							}
						/>
						<InfoModal
							isVisible={showLearnMoreModal}
							title={strings('edit_gas_fee_eip1559.learn_more.title')}
							toggleModal={toggleLearnMoreModal}
							body={
								<View>
									<Text noMargin grey infoModal>
										{strings('edit_gas_fee_eip1559.learn_more.intro')}
									</Text>
									<Text noMargin primary infoModal bold style={styles.learnMoreLabels}>
										{strings('edit_gas_fee_eip1559.learn_more.high_label')}
									</Text>
									<Text noMargin grey infoModal>
										{strings('edit_gas_fee_eip1559.learn_more.high_text')}
									</Text>
									<Text noMargin primary infoModal bold style={styles.learnMoreLabels}>
										{strings('edit_gas_fee_eip1559.learn_more.medium_label')}
									</Text>
									<Text noMargin grey infoModal>
										{strings('edit_gas_fee_eip1559.learn_more.medium_text')}
									</Text>
									<Text noMargin primary infoModal bold style={styles.learnMoreLabels}>
										{strings('edit_gas_fee_eip1559.learn_more.low_label')}
									</Text>
									<Text noMargin grey infoModal>
										{strings('edit_gas_fee_eip1559.learn_more.low_text')}
									</Text>
									<TouchableOpacity style={styles.learnMoreLink}>
										<Text grey infoModal link>
											{strings('edit_gas_fee_eip1559.learn_more.link')}
										</Text>
									</TouchableOpacity>
								</View>
							}
						/>
					</View>
				</TouchableWithoutFeedback>
			</ScrollView>
		</View>
	);
};

EditGasFee1559.propTypes = {
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
	 * Maximum gas fee in native currency
	 */
	gasFeeMaxNative: PropTypes.string,
	/**
	 * Maximum gas fee converted to chosen currency
	 */
	gasFeeMaxConversion: PropTypes.string,
	/**
	 * Maximum priority gas fee in native currency
	 */
	maxPriorityFeeNative: PropTypes.string,
	/**
	 * Maximum priority gas fee converted to chosen currency
	 */
	maxPriorityFeeConversion: PropTypes.string,
	/**
	 * Maximum fee per gas fee in native currency
	 */
	maxFeePerGasNative: PropTypes.string,
	/**
	 * Maximum fee per gas fee converted to chosen currency
	 */
	maxFeePerGasConversion: PropTypes.string,
	/**
	 * Primary currency, either ETH or Fiat
	 */
	primaryCurrency: PropTypes.string,
	/**
	 * A string representing the network chainId
	 */
	chainId: PropTypes.string,
	/**
	 * String that represents the time estimates
	 */
	timeEstimate: PropTypes.string,
	/**
	 * String that represents the color of the time estimate
	 */
	timeEstimateColor: PropTypes.string,
	/**
	 * Error message to show
	 */
	error: PropTypes.string,
	/**
	 * Warning message to show
	 */
	warning: PropTypes.string,
	/**
	 * Boolean that specifies if the gas price was suggested by the dapp
	 */
	dappSuggestedGasPrice: PropTypes.bool
};

export default EditGasFee1559;
