import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';
import { createStackNavigator } from 'react-navigation';
import Step1 from './Step1';

const styles = StyleSheet.create({
	main: {
		flex: 1,
		position: 'absolute',
		backgroundColor: colors.transperent,
		left: 0,
		right: 0,
		top: 0,
		bottom: 0
	}
});

const OnboardingWizardNavigator = createStackNavigator(
	{
		Home: {
			screen: Step1
		}
	},
	{
		cardStyle: {
			backgroundColor: 'transparent'
		},
		transitionConfig: () => ({
			containerStyle: {
				backgroundColor: 'transparent'
			}
		}),
		transparentCard: true,
		mode: 'modal',
		headerMode: 'none'
	}
);

export default class OnboardingWizard extends Component {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	render() {
		return (
			<View style={styles.main}>
				<OnboardingWizardNavigator navigation={this.props.navigation} />
			</View>
		);
	}
}
