import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';
import { createStackNavigator } from 'react-navigation';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import Step5 from './Step5';
import Step6 from './Step6';
import Step7 from './Step7';

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
		},
		Step2: {
			screen: Step2
		},
		Step3: {
			screen: Step3
		},
		Step4: {
			screen: Step4
		},
		Step5: {
			screen: Step5
		},
		Step6: {
			screen: Step6
		},
		Step7: {
			screen: Step7
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
		navigation: PropTypes.object,
		close: PropTypes.func
	};

	static router = {
		...OnboardingWizardNavigator.router
	};

	render() {
		return (
			<View style={styles.main}>
				<OnboardingWizardNavigator
					screenProps={{ close: this.props.close }}
					navigation={this.props.navigation}
				/>
			</View>
		);
	}
}
