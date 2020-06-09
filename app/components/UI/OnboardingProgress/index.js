import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import { Text, View, StyleSheet } from 'react-native';

const ellipsisSize = 20;
const borderRadius = ellipsisSize / 2;

const styles = StyleSheet.create({
	row: {
		display: 'flex',
		flexDirection: 'row'
	},
	onboarding: {
		justifyContent: 'space-between',
		zIndex: 2
	},
	ellipsis: {
		width: ellipsisSize,
		height: ellipsisSize,
		borderWidth: 2,
		borderColor: colors.grey200,
		backgroundColor: colors.white,
		borderRadius
	},
	ellipsisText: {
		fontSize: 11,
		textAlign: 'center',
		...fontStyles.bold,
		color: colors.grey200
	},
	ellipsisSelected: {
		borderColor: colors.blue,
		color: colors.blue
	},
	ellipsisCompleted: {
		borderColor: colors.blue,
		backgroundColor: colors.blue
	},
	ellipsisTextCompleted: {
		color: colors.white
	},
	first: {
		marginLeft: -1
	},
	lines: {
		zIndex: 1,
		marginTop: -(ellipsisSize / 2)
	},
	line: {
		width: '50%',
		height: 2,
		backgroundColor: colors.grey200
	},
	lineSelected: {
		backgroundColor: colors.blue
	}
});

export default class OnboardingProgress extends Component {
	static propTypes = {
		currentStep: PropTypes.number
	};

	render() {
		const { currentStep } = this.props;

		const steps = [1, 2, 3];
		const lines = steps.filter((step, index) => index !== steps.length - 1);
		return (
			<View>
				<View style={[styles.row, styles.onboarding]}>
					{steps.map((step, key) => {
						const isSelected = step === currentStep;
						const isCompleted = step < currentStep;

						const isFirst = step === steps[0];
						return (
							<View
								key={key}
								style={[
									styles.ellipsis,
									isSelected && styles.ellipsisSelected,
									isCompleted && styles.ellipsisCompleted
								]}
							>
								<Text
									style={[
										styles.ellipsisText,
										isSelected && styles.ellipsisSelected,
										isCompleted && styles.ellipsisTextCompleted,
										isFirst && styles.first
									]}
								>
									{step}
								</Text>
							</View>
						);
					})}
				</View>
				<View style={[styles.row, styles.lines]}>
					{lines.map((step, key) => {
						const isSelected = step <= currentStep - 1;
						return <View key={key} style={[styles.line, isSelected && styles.lineSelected]} />;
					})}
				</View>
			</View>
		);
	}
}
