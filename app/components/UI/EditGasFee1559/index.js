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

// import Engine from '../../../core/Engine';
// const { GasFeeController } = Engine.context;
// console.log({ GasFeeController });

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
		lineHeight: 20
	},
	warningText: {
		lineHeight: 20
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
	timeEstimateColor
}) => {
	const [showRangeInfoModal, setShowRangeInfoModal] = useState(false);
	const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
	const [maxPriorityFeeError, setMaxPriorityFeeError] = useState(null);
	const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);
	const [warning, setWarning] = useState(null);
	const [selectedOption, setSelectedOption] = useState(selected);
	const [tempGasFee, setTempGasFee] = useState(gasFee);

	const toggleRangeInfoModal = useCallback(() => {
		setShowRangeInfoModal(showRangeInfoModal => !showRangeInfoModal);
	}, []);

	const toggleAdvancedOptions = useCallback(() => {
		setShowAdvancedOptions(showAdvancedOptions => !showAdvancedOptions);
	}, []);

	const toggleLearnMoreModal = useCallback(() => {
		setShowLearnMoreModal(showLearnMoreModal => !showLearnMoreModal);
	}, []);

	// TODO: Use this function where it's appropriate
	// eslint-disable-next-line no-unused-vars
	const showWarning = useCallback(warningMessage => {
		setWarning(warningMessage);
	}, []);

	const calculateGas = useCallback(
		gas => {
			setTempGasFee(gas);
			onChange(gas);
		},
		[onChange]
	);

	const changedMaxPriorityFee = useCallback(
		value => {
			if (Number(value) <= 0) {
				return setMaxPriorityFeeError(strings('edit_gas_fee_eip1559.priority_fee_at_least_0_error'));
			}
			setMaxPriorityFeeError(null);
			const newGas = { ...tempGasFee, suggestedMaxPriorityFeePerGas: value };
			setTempGasFee(newGas);
			setSelectedOption(null);
			calculateGas(newGas);
		},
		[calculateGas, tempGasFee]
	);

	const changedFeePerGas = useCallback(
		value => {
			const newGas = { ...tempGasFee, suggestedMaxFeePerGas: value };
			setTempGasFee(newGas);
			setSelectedOption(null);
			calculateGas(newGas);
		},
		[calculateGas, tempGasFee]
	);

	const selectOption = useCallback(
		option => {
			setSelectedOption(option);
			calculateGas(gasOptions[option]);
		},
		[calculateGas, gasOptions]
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
							>
								<View style={styles.warningTextContainer}>
									<Text black style={styles.warningText}>
										{warning}
									</Text>
								</View>
							</Alert>
						)}

						{/* TODO: Put the right values and message on the header */}
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
								Up to{' '}
								<Text bold black>
									{gasFeeMaxPrimary} ({gasFeeMaxSecondary})
								</Text>
							</Text>
							<Text green={timeEstimateColor === 'green'} red={timeEstimateColor === 'red'}>
								{timeEstimate}
							</Text>
						</View>
						<View>
							{/* TODO: hook with controller, add strings i18n */}
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
											value={'21000'}
											label={'Gas limit'}
											increment={1000}
										/>
									</View>
									<View style={styles.rangeInputContainer}>
										<RangeInput
											leftLabelComponent={
												<View style={styles.labelTextContainer}>
													<Text black bold noMargin>
														{strings('edit_gas_fee_eip1559.max_priority_fee')}{' '}
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
											rightLabelComponent={
												<Text noMargin small grey>
													<Text bold reset>
														{strings('edit_gas_fee_eip1559.estimate')}:
													</Text>{' '}
													{gasFee.suggestedMaxPriorityFeePerGas} GWEI
												</Text>
											}
											value={tempGasFee.suggestedMaxPriorityFeePerGas}
											label={'Gas limit'}
											unit={'GWEI'}
											increment={1.0}
											inputInsideLabel={`≈ ${maxPriorityFeePerGasPrimary}`}
											onChangeValue={changedMaxPriorityFee}
											error={maxPriorityFeeError}
										/>
									</View>
									<View style={styles.rangeInputContainer}>
										<RangeInput
											leftLabelComponent={
												<View style={styles.labelTextContainer}>
													<Text black bold noMargin>
														{strings('edit_gas_fee_eip1559.max_fee')}{' '}
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
											rightLabelComponent={
												<Text noMargin small grey>
													<Text bold reset>
														{strings('edit_gas_fee_eip1559.estimate')}:
													</Text>{' '}
													{gasFee.suggestedMaxFeePerGas} GWEI
												</Text>
											}
											value={tempGasFee.suggestedMaxFeePerGas}
											label={'Gas limit'}
											unit={'GWEI'}
											increment={10}
											onChangeValue={changedFeePerGas}
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
							<StyledButton type={'confirm'} onPress={onSave}>
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

EditGasFee1559.propTypes = {
	selected: PropTypes.string,
	gasFee: PropTypes.object,
	gasOptions: PropTypes.object,
	onChange: PropTypes.func,
	onCancel: PropTypes.func,
	onSave: PropTypes.func,
	gasFeeNative: PropTypes.string,
	gasFeeConversion: PropTypes.string,
	gasFeeMaxNative: PropTypes.string,
	gasFeeMaxConversion: PropTypes.string,
	maxPriorityFeeNative: PropTypes.string,
	maxPriorityFeeConversion: PropTypes.string,
	maxFeePerGasNative: PropTypes.string,
	maxFeePerGasConversion: PropTypes.string,
	primaryCurrency: PropTypes.string,
	chainId: PropTypes.string,
	timeEstimate: PropTypes.string,
	timeEstimateColor: PropTypes.string
};

export default EditGasFee1559;
