import React, { Component } from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import { colors } from '../../../../styles/common';
import StyledButton from '../../StyledButton';

const styles = StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: colors.dimmed
	}
});

export default class Step1 extends Component {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
	};

	onNext = () => {
		//
	};

	onBack = () => {
		//
	};

	render() {
		return (
			<SafeAreaView style={styles.main}>
				<Text>OnboardingWizard Step1</Text>
				<StyledButton type={'orange'} onPress={this.onBack}>
					Back
				</StyledButton>
				<StyledButton type={'blue'} onPress={this.onNext}>
					Next
				</StyledButton>
			</SafeAreaView>
		);
	}
}
