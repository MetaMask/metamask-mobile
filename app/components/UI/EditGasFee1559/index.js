import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../../Base/Text';
import RangeInput from '../../Base/RangeInput';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../styles/common';
import InfoModal from '../Swaps/components/InfoModal';
import Icon from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	root: {
		paddingHorizontal: 24
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
		marginTop: 20,
		marginBottom: 45
	},
	advancedOptionsInputsContainer: {
		marginTop: 20
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
	}
});

const EditGasFee1559 = () => {
	const [showRangeInfoModal, setShowRangeInfoModal] = useState(false);
	const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
	const [maxPriorityFeeError, setMaxPriorityFeeError] = useState(null);

	const toggleRangeInfoModal = () => {
		setShowRangeInfoModal(showRangeInfoModal => !showRangeInfoModal);
	};

	const toggleAdvancedOptions = () => {
		setShowAdvancedOptions(showAdvancedOptions => !showAdvancedOptions);
	};

	const changedMaxPriorityFee = value => {
		if (Number(value) <= 0) {
			return setMaxPriorityFeeError(strings('edit_gas_fee_eip1559.priority_fee_at_least_0_error'));
		}
		setMaxPriorityFeeError(null);
	};

	return (
		<View style={styles.root}>
			<View>
				<Text>HEADER</Text>
			</View>
			<View>
				<Text>SELECTOR</Text>
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
								initialValue={'21000'}
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
										1 GWEI
									</Text>
								}
								initialValue={'1'}
								label={'Gas limit'}
								estimate={'1 GWEI'}
								unit={'GWEI'}
								increment={1}
								inputInsideLabel={'≈ $0.06'}
								onChangeValue={changedMaxPriorityFee}
								error={maxPriorityFeeError}
							/>
						</View>
						<View style={styles.rangeInputContainer}>
							<RangeInput
								leftLabelComponent={
									<View style={styles.labelTextContainer}>
										<Text black bold noMargin>
											Max fee{' '}
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
										265 GWEI
									</Text>
								}
								initialValue={'300'}
								label={'Gas limit'}
								estimate={'1 GWEI'}
								unit={'GWEI'}
								increment={10}
								inputInsideLabel={'≈ $19.81'}
							/>
						</View>
					</View>
				)}
			</View>
			<View>
				<Text>SAVE BUTTON</Text>
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
		</View>
	);
};

export default EditGasFee1559;
