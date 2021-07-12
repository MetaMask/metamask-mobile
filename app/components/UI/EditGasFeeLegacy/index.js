/* eslint-disable react/display-name */
import React, { useCallback, useState } from 'react';
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
	warning
}) => {
	const onlyAdvanced = gasEstimateType !== GAS_ESTIMATE_TYPES.LEGACY;

	const [showRangeInfoModal, setShowRangeInfoModal] = useState(false);
	const [showAdvancedOptions, setShowAdvancedOptions] = useState(!selected || onlyAdvanced);
	const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);
	const [selectedOption, setSelectedOption] = useState(selected);
	const [gasPriceError, setGasPriceError] = useState();

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

	const changedGasPrice = useCallback(
		value => {
			const lowerValue = new BigNumber(
				gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY ? gasOptions?.low : gasOptions?.gasPrice
			);
			const higherValue = new BigNumber(
				gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY ? gasOptions?.low : gasOptions?.gasPrice
			).multipliedBy(new BigNumber(1.5));

			const valueBN = new BigNumber(value);

			if (lowerValue && valueBN.lt(lowerValue)) {
				setGasPriceError('Gas price is low for current network conditions');
			} else if (higherValue && valueBN.gt(higherValue)) {
				setGasPriceError('Gas price is higher than necessary');
			} else {
				setGasPriceError('');
			}

			const newGas = { ...gasFee, suggestedGasPrice: value };

			changeGas(newGas, null);
		},
		[changeGas, gasEstimateType, gasFee, gasOptions]
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
														<MaterialCommunityIcon
															name="information"
															size={14}
															style={styles.labelInfo}
														/>
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
						)}
						<View style={styles.advancedOptionsContainer}>
							{!onlyAdvanced && (
								<TouchableOpacity onPress={toggleAdvancedOptions} style={styles.advancedOptionsButton}>
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
														onPress={toggleRangeInfoModal}
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
														onPress={toggleRangeInfoModal}
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
	warning: PropTypes.string
};

export default EditGasFeeLegacy;
