import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../styles/common';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import Text from './Text';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	labelContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 14
	},
	rangeInputContainer: {
		borderColor: colors.grey200,
		borderWidth: 1,
		borderRadius: 6,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		height: 42
	},
	input: error => ({
		height: 38,
		minWidth: 10,
		paddingRight: 6,
		color: error ? colors.red : colors.black
	}),
	buttonContainerLeft: {
		marginLeft: 17,
		flex: 1
	},
	buttonContainerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		marginRight: 17,
		flex: 1
	},
	button: {
		borderRadius: 100,
		borderWidth: 2,
		borderColor: colors.blue,
		height: 20,
		width: 20,
		alignItems: 'center',
		justifyContent: 'center'
	},
	buttonText: {
		paddingTop: 1,
		paddingLeft: 0.5,
		color: colors.blue
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	errorContainer: {
		marginTop: 8,
		color: colors.red,
		flexDirection: 'row',
		alignItems: 'center'
	},
	errorIcon: {
		paddingRight: 4,
		color: colors.red
	},
	conversionEstimation: {
		marginRight: 14
	}
});

const RangeInput = ({
	leftLabelComponent,
	rightLabelComponent,
	initialValue,
	unit,
	increment,
	onChangeValue,
	inputInsideLabel,
	error,
	min,
	max
}) => {
	const [value, setValue] = useState(initialValue);
	const textInput = useRef(null);

	const handleClickUnit = () => {
		textInput.current.focus();
	};

	const changeValue = newValue => {
		onChangeValue?.(newValue);
		setValue(newValue);
	};

	const increaseNumber = () => {
		const newValue = Number(value) + increment;
		if (newValue > max) return;
		changeValue(String(newValue));
	};

	const decreaseNumber = () => {
		const newValue = Number(value) - increment;
		if (newValue < min) return;
		changeValue(String(newValue));
	};

	return (
		<View>
			<View style={styles.labelContainer}>
				{leftLabelComponent}
				{rightLabelComponent}
			</View>

			<View style={styles.rangeInputContainer}>
				<View style={styles.buttonContainerLeft}>
					<TouchableOpacity style={styles.button} hitSlop={styles.hitSlop} onPress={decreaseNumber}>
						<FontAwesomeIcon name="minus" size={10} style={styles.buttonText} />
					</TouchableOpacity>
				</View>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input(!!error)}
						onChangeText={changeValue}
						value={value}
						keyboardType="numeric"
						ref={textInput}
					/>
					{!!unit && (
						<Text onPress={handleClickUnit} black={!error} red={!!error}>
							{unit}
						</Text>
					)}
				</View>
				<View style={styles.buttonContainerRight}>
					<Text style={styles.conversionEstimation} small>
						{inputInsideLabel}
					</Text>
					<TouchableOpacity style={styles.button} hitSlop={styles.hitSlop} onPress={increaseNumber}>
						<FontAwesomeIcon name="plus" size={10} style={styles.buttonText} />
					</TouchableOpacity>
				</View>
			</View>
			{!!error && (
				<View style={styles.errorContainer}>
					<FontAwesomeIcon name="exclamation-circle" size={14} style={styles.errorIcon} />
					<Text red noMargin small>
						{error}
					</Text>
				</View>
			)}
		</View>
	);
};

RangeInput.defaultProps = {
	increment: 1
};

RangeInput.propTypes = {
	rightLabelComponent: PropTypes.node,
	leftLabelComponent: PropTypes.node,
	initialValue: PropTypes.string,
	unit: PropTypes.string,
	onChangeValue: PropTypes.func,
	increment: PropTypes.number,
	inputInsideLabel: PropTypes.string,
	error: PropTypes.string,
	min: PropTypes.number,
	max: PropTypes.number
};

export default RangeInput;
