import React, { Component } from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	main: {
		flex: 1,
		position: 'absolute',
		backgroundColor: colors.onboardingWizardBackground,
		left: 0,
		right: 0,
		top: 0,
		bottom: 0
	}
});

export default class OnboardingWizard extends Component {
	static propTypes = {};

	render() {
		return (
			<SafeAreaView style={styles.main}>
				<Text>OnboardingWizard</Text>
			</SafeAreaView>
		);
	}
}
