import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import Step5 from './Step5';
import Step6 from './Step6';
import Step7 from './Step7';

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
		backgroundColor: colors.transperent
	}
});

export default class OnboardingWizard extends Component {
	static propTypes = {
		close: PropTypes.func
	};

	state = {
		step: 'Step1'
	};

	navigate = step => {
		this.setState({ step });
	};

	onboardingWizardNavigator = {
		Step1: <Step1 onClose={this.props.close} navigate={this.navigate} />,
		Step2: <Step2 onClose={this.props.close} navigate={this.navigate} />,
		Step3: <Step3 onClose={this.props.close} navigate={this.navigate} />,
		Step4: <Step4 onClose={this.props.close} navigate={this.navigate} />,
		Step5: <Step5 onClose={this.props.close} navigate={this.navigate} />,
		Step6: <Step6 onClose={this.props.close} navigate={this.navigate} />,
		Step7: <Step7 onClose={this.props.close} navigate={this.navigate} />
	};

	render() {
		const { step } = this.state;
		return (
			<View style={styles.root}>
				<View style={styles.main}>{this.onboardingWizardNavigator[step]}</View>
			</View>
		);
	}
}
