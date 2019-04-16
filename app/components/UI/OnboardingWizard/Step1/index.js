import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, StyleSheet } from 'react-native';
import Coachmark from '../Coachmark';
import DeviceSize from '../../../../util/DeviceSize';
import setOnboardingWizardStep from '../../../../actions/wizard';

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	coachmark: {
		marginHorizontal: 16
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: DeviceSize.isIphoneX() ? 36 : 16
	}
});

class Step1 extends Component {
	static propTypes = {
		onClose: PropTypes.func,
		setOnboardingWizardStep: PropTypes.func
	};

	onNext = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(2);
	};

	onBack = () => {
		this.onClose();
	};

	onClose = () => {
		const { onClose } = this.props;
		onClose && onClose();
	};

	render() {
		return (
			<View style={styles.main}>
				<View style={styles.coachmarkContainer}>
					<Coachmark
						title={'Welcome to your new wallet!'}
						content={
							'To use blockchain applications (DAPPS) you need a wallet because blockchain actions cost Ether (ETH). \n\n To use blockchain applications (DAPPS) you need a wallet because blockchain actions cost Ether (ETH)'
						}
						onNext={this.onNext}
						onBack={this.onBack}
						onClose={this.onClose}
						coachmarkStyle={styles.coachmark}
						action
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
)(Step1);
