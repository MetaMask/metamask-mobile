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
		marginHorizontal: 45
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 200
	}
});

class Step3 extends Component {
	static propTypes = {
		setOnboardingWizardStep: PropTypes.func,
		screenProps: PropTypes.object
	};

	onNext = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(4);
	};

	onBack = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(2);
	};

	onClose = () => {
		const { close } = this.props.screenProps;
		close && close();
	};

	render() {
		return (
			<View style={styles.main}>
				<View style={styles.coachmarkContainer}>
					<Coachmark
						title={'Edit Account Name'}
						content={`'Account 1' isn't that catchy. So why not name your account omething a little more memorable.\n\n<b>Long tap</n> now to edit account name.`}
						onNext={this.onNext}
						onBack={this.onBack}
						onClose={this.onClose}
						style={styles.some}
						topIndicatorPosition={'topCenter'}
						currentStep={2}
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
)(Step3);
