import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../../styles/common';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { DrawerActions } from 'react-navigation-drawer'; // eslint-disable-line

const styles = StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: colors.transparent
	},
	some: {
		marginLeft: 30,
		marginRight: 80
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 400
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

	render() {
		return (
			<View style={styles.main}>
				<View style={styles.coachmarkContainer}>
					<Coachmark
						title={'Explore the Browser'}
						content={'You can explore blockchainapplications (DAPPS) in the Browser.'}
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
