import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { DrawerActions } from 'react-navigation-drawer'; // eslint-disable-line
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';

const styles = StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: colors.transparent
	},
	some: {
		marginLeft: 30,
		marginRight: 30
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: Platform.OS === 'ios' ? 400 : 370
	}
});

class Step5 extends Component {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Dispatch set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with next step
	 * Closing drawer and navigating to 'BrowserView'
	 */
	onNext = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(6);
		navigation && navigation.dispatch(DrawerActions.closeDrawer());
		navigation && navigation.navigate('BrowserView');
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with next step
	 * Closing drawer and navigating to 'WalletView'
	 */
	onBack = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(4);
		navigation && navigation.navigate('WalletView');
		navigation && navigation.dispatch(DrawerActions.closeDrawer());
	};

	/**
	 * Returns content for this step
	 */
	content = () => (
		<View style={onboardingStyles.contentContainer}>
			<Text style={onboardingStyles.content}>
				{strings('onboarding_wizard.step5.content1')}
				<Text style={fontStyles.bold}> {strings('onboarding_wizard.step5.content2')} </Text>
			</Text>
		</View>
	);

	render() {
		return (
			<View style={styles.main}>
				<View style={styles.coachmarkContainer}>
					<Coachmark
						title={strings('onboarding_wizard.step5.title')}
						content={this.content()}
						onNext={this.onNext}
						onBack={this.onBack}
						style={styles.some}
						topIndicatorPosition={'topLeft'}
						currentStep={4}
					/>
				</View>
			</View>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

export default connect(
	null,
	mapDispatchToProps
)(Step5);
