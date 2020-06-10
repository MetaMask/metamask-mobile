import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import { Text, View, StyleSheet } from 'react-native';

const ellipsisSize = 20;
const borderRadius = ellipsisSize / 2;

const styles = StyleSheet.create({
	onboardingContainer: {
		marginBottom: 40
	},
	step: {
		display: 'flex',
		alignItems: 'center'
	},
	stepText: {
		marginTop: 4,
		fontSize: 11,
		color: colors.black
	},
	stepTextSelected: {
		color: colors.blue
	},
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
		marginTop: -30,
		marginHorizontal: 24
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

		const steps = ['Wallet setup', 'Create Password', 'Secure wallet'];
		const lines = steps.filter((step, index) => index !== steps.length - 1);
		return (
			<View style={styles.onboardingContainer}>
				<View style={[styles.row, styles.onboarding]}>
					{steps.map((step, key) => {
						const isSelected = key + 1 === currentStep;
						const isCompleted = key + 1 < currentStep;

						const isFirst = key === 0;
						return (
							<View key={key} style={styles.step}>
								<View
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
										{key + 1}
									</Text>
								</View>
								<Text style={[styles.stepText, (isSelected || isCompleted) && styles.stepTextSelected]}>
									{steps[key]}
								</Text>
							</View>
						);
					})}
				</View>
				<View style={[styles.row, styles.lines]}>
					{lines.map((step, key) => {
						const isSelected = key + 1 < currentStep;
						return <View key={key} style={[styles.line, isSelected && styles.lineSelected]} />;
					})}
				</View>
			</View>
		);
	}
}
