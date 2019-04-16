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
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 160,
		marginHorizontal: 45
	}
});

class Step7 extends Component {
	static propTypes = {
		setOnboardingWizardStep: PropTypes.func,
		onClose: PropTypes.func
	};

	onNext = () => {
		this.onClose();
	};

	onBack = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(6);
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
						title={'Featured Dapps'}
						content={'Start exploring featured blockchain applications (DAPPS).'}
						onNext={this.onNext}
						onBack={this.onBack}
						onClose={this.onClose}
						currentStep={5}
						bottomIndicatorPosition={'bottomLeft'}
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
)(Step7);
