import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import Step5 from './Step5';
import Step6 from './Step6';
import Step7 from './Step7';
import setOnboardingWizardStep from '../../../actions/wizard';
import { DrawerActions } from 'react-navigation-drawer'; // eslint-disable-line
import { strings } from '../../../../locales/i18n';
import AsyncStorage from '@react-native-community/async-storage';

const styles = StyleSheet.create({
	root: {
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		position: 'absolute'
	},
	main: {
		flex: 1,
		backgroundColor: colors.transparent
	},
	skip: {
		height: 30,
		bottom: 30
	},
	skipText: {
		...fontStyles.normal,
		textAlign: 'center',
		fontSize: 18,
		color: colors.blue
	}
});

class OnboardingWizard extends Component {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Wizard state
		 */
		wizard: PropTypes.object,
		/**
		 * Dispatch set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func
	};

	/**
	 * Close onboarding wizard setting step to 0 and closing drawer
	 */
	closeOnboardingWizard = async () => {
		const { setOnboardingWizardStep, navigation } = this.props;
		await AsyncStorage.setItem('@MetaMask:onboardingWizard', 'explored');
		setOnboardingWizardStep && setOnboardingWizardStep(0);
		navigation && navigation.dispatch(DrawerActions.closeDrawer());
	};

	onboardingWizardNavigator = {
		1: <Step1 onClose={this.closeOnboardingWizard} />,
		2: <Step2 />,
		3: <Step3 />,
		4: <Step4 navigation={this.props.navigation} />,
		5: <Step5 navigation={this.props.navigation} />,
		6: <Step6 navigation={this.props.navigation} />,
		7: <Step7 onClose={this.closeOnboardingWizard} />
	};

	render() {
		const {
			wizard: { step }
		} = this.props;
		return (
			<View style={styles.root}>
				<View style={styles.main}>{this.onboardingWizardNavigator[step]}</View>
				{step !== 1 && (
					<TouchableOpacity style={styles.skip} onPress={this.closeOnboardingWizard}>
						<Text style={styles.skipText}>{strings('onboarding_wizard.skip_tutorial')}</Text>
					</TouchableOpacity>
				)}
			</View>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

const mapStateToProps = state => ({
	wizard: state.wizard
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(OnboardingWizard);
