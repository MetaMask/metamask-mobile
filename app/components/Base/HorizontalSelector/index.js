import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../Text';
import { colors } from '../../../styles/common';

const INNER_CIRCLE_SCALE = 0.445;
const OPTION_WIDTH = 120;
const styles = StyleSheet.create({
	selector: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center'
	},
	labels: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'flex-start'
	},
	option: {
		width: OPTION_WIDTH,
		display: 'flex',
		alignItems: 'center',
		flex: 0,
		flexDirection: 'column'
	},
	optionFull: {
		width: OPTION_WIDTH
	},
	optionHalf: {
		width: OPTION_WIDTH
	},
	circle: {
		flexShrink: 0,
		flexGrow: 0,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderRadius: 9999,
		borderColor: colors.grey200
	},
	circleSelected: {
		borderColor: colors.blue
	},
	circleError: {
		borderColor: colors.red
	},
	circleDisabled: {
		opacity: 0.4
	},
	innerCircle: {
		flexShrink: 0,
		flexGrow: 0,
		backgroundColor: colors.blue,
		borderRadius: 999
	},
	innerCircleError: {
		backgroundColor: colors.red
	},
	verticalLine: {
		marginTop: 2,
		marginBottom: -1,
		width: 0,
		height: 4,
		borderLeftWidth: 1,
		borderColor: colors.grey200
	},
	topVerticalLine: {
		marginTop: 0,
		marginBottom: 2,
		width: 0,
		height: 4,
		borderLeftWidth: 1,
		borderColor: colors.blue
	},
	line: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-around',
		width: '100%',
		marginBottom: 2
	},
	lineHolder: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 0
	},
	lineFill: {
		flex: 1
	},
	lineVisible: {
		borderTopWidth: 1,
		borderColor: colors.grey200
	},
	circleHitSlop: {
		top: 10,
		bottom: 10,
		left: 10,
		right: 10
	}
});

function Circle({ size = 22, selected, disabled, error }) {
	return (
		<View
			style={[
				styles.circle,
				selected && styles.circleSelected,
				selected && error && styles.circleError,
				disabled && styles.circleDisabled,
				{ width: size, height: size }
			]}
		>
			{selected && (
				<View
					style={[
						styles.innerCircle,
						selected && error && styles.innerCircleError,
						{ width: size * INNER_CIRCLE_SCALE, height: size * INNER_CIRCLE_SCALE }
					]}
				/>
			)}
		</View>
	);
}
Circle.propTypes = {
	size: PropTypes.number,
	selected: PropTypes.bool,
	disabled: PropTypes.bool,
	error: PropTypes.bool
};

function Option({ onPress, name, ...props }) {
	const handlePress = useCallback(() => onPress(name), [name, onPress]);
	return <TouchableOpacity onPress={handlePress} style={styles.option} {...props} />;
}

Option.propTypes = {
	onPress: PropTypes.func,
	name: PropTypes.string
};

function HorizontalSelector({ options = [], selected, circleSize, onPress, disabled, ...props }) {
	return (
		<View {...props}>
			{options.some(option => option.topLabel) && (
				<View style={styles.selector}>
					{options.map(option =>
						option.topLabel ? (
							<View style={styles.option}>
								{typeof option.topLabel === 'string' ? (
									<Text noMargin bold link small centered>
										{option.topLabel}
									</Text>
								) : typeof option.topLabel === 'function' ? (
									option.topLabel(option.name === selected, option.disabled ?? disabled)
								) : (
									option.topLabel
								)}
								<View style={styles.topVerticalLine} />
							</View>
						) : (
							<View style={styles.option} />
						)
					)}
				</View>
			)}
			<View style={styles.selector}>
				{options.map(option => (
					<Option
						key={option.name}
						onPress={onPress}
						selected={option.name === selected}
						hitSlop={styles.circleHitSlop}
						{...option}
						disabled={disabled ?? option.disabled}
					>
						<Circle
							selected={option.name === selected}
							size={circleSize}
							disabled={option.disabled || disabled}
							error={option.error}
						/>
						<View style={styles.verticalLine} />
					</Option>
				))}
			</View>
			<View style={styles.line}>
				{options.map((option, index, array) => (
					<>
						<View style={[styles.lineFill, index !== 0 && styles.lineVisible]} />
						<View key={option.name} style={[styles.lineHolder, styles.optionFull]}>
							<View style={[styles.lineFill, styles.optionHalf, index !== 0 && styles.lineVisible]} />
							<View
								style={[
									styles.lineFill,
									styles.optionHalf,
									index !== array.length - 1 && styles.lineVisible
								]}
							/>
						</View>
						<View style={[styles.lineFill, index !== array.length - 1 && styles.lineVisible]} />
					</>
				))}
			</View>
			<View style={styles.labels}>
				{options.map(option => (
					<Option
						key={option.name}
						onPress={onPress}
						selected={option.name === selected}
						{...option}
						disabled={disabled ?? option.disabled}
					>
						{typeof option.label === 'string' ? (
							<Text centered>{option.label}</Text>
						) : typeof option.label === 'function' ? (
							option.label(option.name === selected, option.disabled ?? disabled)
						) : (
							option.label
						)}
					</Option>
				))}
			</View>
		</View>
	);
}

HorizontalSelector.propTypes = {
	options: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.oneOfType([PropTypes.element, PropTypes.string, PropTypes.node]),
			topLabel: PropTypes.oneOfType([PropTypes.element, PropTypes.string, PropTypes.node]),
			name: PropTypes.string,
			disabled: PropTypes.bool,
			error: PropTypes.bool
		})
	),
	disabled: PropTypes.bool,
	onPress: PropTypes.func,
	circleSize: PropTypes.number,
	selected: PropTypes.string
};

export default HorizontalSelector;
