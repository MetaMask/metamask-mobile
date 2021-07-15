/* eslint-disable react/display-name */
import React, { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import PropTypes from 'prop-types';
import { GAS_ESTIMATE_TYPES } from '@metamask/controllers';
import BigNumber from 'bignumber.js';
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
import FadeAnimationView from '../FadeAnimationView';

const GAS_LIMIT_INCREMENT = new BigNumber(1000);
const GAS_PRICE_INCREMENT = new BigNumber(1);
const GAS_LIMIT_MIN = new BigNumber(21000);
const GAS_PRICE_MIN = new BigNumber(1);

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
		fontSize: 48
	},
	headerTitle: {
		flexDirection: 'row'
	},
	headerTitleSide: {
		flex: 1
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
	warningTextContainer: {
		paddingLeft: 4,
		lineHeight: 20,
		textAlign: 'center'
	},
	warningText: {
		lineHeight: 20
	}
});

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
	recommended,
	warningMinimumEstimateOption,
	onUpdatingValuesStart,
	onUpdatingValuesEnd,
	canAnimate,
	isAnimating
}) => {
	const onlyAdvanced = gasEstimateType !== GAS_ESTIMATE_TYPES.LEGACY;
	const [showRangeInfoModal, setShowRangeInfoModal] = useState(false);
	const [showAdvancedOptions, setShowAdvancedOptions] = useState(!selected || onlyAdvanced);
	const [selectedOption, setSelectedOption] = useState(selected);
	const [gasPriceError, setGasPriceError] = useState();

	const toggleAdvancedOptions = useCallback(() => {
		setShowAdvancedOptions(showAdvancedOptions => !showAdvancedOptions);
	}, []);

	const save = useCallback(() => {
		onSave(selectedOption);
	}, [onSave, selectedOption]);

	const changeGas = useCallback(
		(gas, selectedOption) => {
			setSelectedOption(selectedOption);
			onChange(gas, selectedOption);
		},
		[onChange]
	);

	const changedGasPrice = useCallback(
		value => {
			const lowerValue = new BigNumber(
				gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
					? gasOptions?.[warningMinimumEstimateOption]
					: gasOptions?.gasPrice
			);
			const higherValue = new BigNumber(
				gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY ? gasOptions?.high : gasOptions?.gasPrice
			).multipliedBy(new BigNumber(1.5));

			const valueBN = new BigNumber(value);

			if (!lowerValue.isNaN() && valueBN.lt(lowerValue)) {
				setGasPriceError('Gas price is low for current network conditions');
			} else if (!higherValue.isNaN() && valueBN.gt(higherValue)) {
				setGasPriceError('Gas price is higher than necessary');
			} else {
				setGasPriceError('');
			}

			const newGas = { ...gasFee, suggestedGasPrice: value };

			changeGas(newGas, null);
		},
		[changeGas, gasEstimateType, gasFee, gasOptions, warningMinimumEstimateOption]
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
			setGasPriceError('');
			setSelectedOption(option);
			changeGas({ ...gasFee, suggestedGasPrice: gasOptions[option] }, option);
		},
		[changeGas, gasFee, gasOptions]
	);

	const shouldIgnore = useCallback(option => ignoreOptions.find(item => item === option), [ignoreOptions]);

	const renderOptions = useMemo(() => {
		const options = [
			{ name: 'low', label: 'Low' },
			{ name: 'medium', label: 'Medium' },
			{ name: 'high', label: 'High' }
		];
		return options
			.filter(option => !shouldIgnore(option.name))
			.map(option => {
				const renderOption = {
					name: option.name,
					label: (selected, disabled) => (
						<Text bold primary={selected && !disabled}>
							{option.label}
						</Text>
					)
				};
				if (recommended && recommended.name === option.name) {
					renderOption.topLabel = recommended.render;
				}
				return renderOption;
			});
	}, [recommended, shouldIgnore]);

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
						{Boolean(error) && (
							<Alert
								small
								type="error"
								renderIcon={() => (
									<MaterialCommunityIcon name="information" size={20} color={colors.red} />
								)}
							>
								<View style={styles.warningTextContainer}>
									<Text red>{error}</Text>
								</View>
							</Alert>
						)}
						{Boolean(warning) && (
							<Alert
								small
								type="warning"
								renderIcon={() => (
									<MaterialCommunityIcon name="information" size={20} color={colors.yellow} />
								)}
							>
								<View style={styles.warningTextContainer}>
									<Text black style={styles.warningText}>
										{warning}
									</Text>
								</View>
							</Alert>
						)}
						<FadeAnimationView
							valueToWatch={gasFeePrimary}
							canAnimate={canAnimate}
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
											<Icon name={`ios-arrow-${showAdvancedOptions ? 'up' : 'down'}`} />
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
												name={'Gas limit'}
												increment={GAS_LIMIT_INCREMENT}
											/>
										</View>
										<View style={styles.rangeInputContainer}>
											<RangeInput
												leftLabelComponent={
													<View style={styles.labelTextContainer}>
														<Text black bold noMargin>
															Gas price{' '}
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
												name={'Gas price'}
												unit={'GWEI'}
												increment={GAS_PRICE_INCREMENT}
												min={GAS_PRICE_MIN}
												inputInsideLabel={`≈ ${gasFeeConversion}`}
												onChangeValue={changedGasPrice}
												error={gasPriceError}
											/>
										</View>
									</View>
								)}
							</View>
						</FadeAnimationView>
						<View>
							<StyledButton type={'confirm'} onPress={save} disabled={Boolean(error) || isAnimating}>
								{strings('edit_gas_fee_eip1559.save')}
							</StyledButton>
						</View>
						<InfoModal
							isVisible={Boolean(showRangeInfoModal)}
							title={
								showRangeInfoModal === 'gas_limit'
									? 'Gas limit'
									: showRangeInfoModal === 'gas_price'
									? 'Gas price'
									: null
							}
							toggleModal={() => setShowRangeInfoModal(null)}
							body={
								<View>
									<Text grey infoModal>
										{showRangeInfoModal === 'gas_limit' &&
											`Gas limit is the maximum units of gas you are willing to use. Units of gas are a multiplier to “Max priority fee” and “Max fee”.`}
										{showRangeInfoModal === 'gas_price' &&
											`This network requires a “Gas price” field when submitting a transaction. Gas price is the maximum amount you are willing to pay per unit of gas.`}
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
	warningMinimumEstimateOption: 'low'
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
	error: PropTypes.string,
	/**
	 * Warning message to show
	 */
	warning: PropTypes.string,
	/**
	 * Ignore option array
	 */
	ignoreOptions: PropTypes.array,
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
	canAnimate: PropTypes.bool,
	/**
	 * Boolean to determine if the animation is happening
	 */
	isAnimating: PropTypes.bool
};

export default EditGasFeeLegacy;
