import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import { Text, View, StyleSheet } from 'react-native';

const ellipsisSize = 20;
const borderRadius = ellipsisSize / 2;

const styles = StyleSheet.create({
	container: {
		position: 'relative',
		marginBottom: 30
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
		position: 'absolute',
		top: borderRadius
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
	constructor() {
		super();
		this.ranOnce = false;
		this.marker = undefined;
		this.state = {
			offset: 0
		};
	}

	static propTypes = {
		currentStep: PropTypes.number.isRequired,
		steps: PropTypes.array.isRequired
	};

	onLayout = ({ nativeEvent }) => {
		if (this.marker) {
			this.marker.measure((x, y, width, height, pageX, pageY) => {
				if (!this.ranOnce) {
					this.setState(
						{
							offset: Math.floor(width / 2)
						},
						() => {
							this.ranOnce = true;
						}
					);
				}
			});
		}
	};

	defineRef = ref => (this.marker = ref);

	render() {
		const { offset } = this.state;
		const { currentStep, steps } = this.props;
		const lines = steps.filter((step, index) => index !== steps.length - 1);
		return (
			<View style={styles.container}>
				<View style={[styles.row, styles.onboarding]}>
					{steps.map((step, key) => {
						const isSelected = key + 1 === currentStep;
						const isCompleted = key + 1 < currentStep;

						const isFirst = key === 0;
						return (
							<View key={key} style={styles.step} ref={this.defineRef} onLayout={this.onLayout}>
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
				<View style={[styles.row, styles.lines, { marginHorizontal: offset || 0 }]}>
					{lines.map((step, key) => {
						const isSelected = key + 1 < currentStep;
						return <View key={key} style={[styles.line, isSelected && styles.lineSelected]} />;
					})}
				</View>
			</View>
		);
	}
}
