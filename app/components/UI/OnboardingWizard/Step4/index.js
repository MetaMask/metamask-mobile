import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, StyleSheet } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	some: {
		marginLeft: 10,
		marginRight: 85
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 90
	}
});

class Step4 extends Component {
	static propTypes = {
		navigation: PropTypes.object,
		setOnboardingWizardStep: PropTypes.func
	};

	onNext = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		navigation && navigation.openDrawer();
		setOnboardingWizardStep && setOnboardingWizardStep(5);
	};

	onBack = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(3);
	};

	render() {
		return (
			<View style={styles.main}>
				<View style={styles.coachmarkContainer}>
					<Coachmark
						title={'Main Navigation'}
						content={
							'Tap here to access your Wallet, Browser, and Transaction history.\n\nYou can take more actionswith your accounts & access MetaMask settings.'
						}
						onNext={this.onNext}
						onBack={this.onBack}
						style={styles.some}
						topIndicatorPosition={'topLeftCorner'}
						currentStep={3}
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
)(Step4);
