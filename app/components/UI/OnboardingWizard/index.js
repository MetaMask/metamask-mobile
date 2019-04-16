import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';
import { connect } from 'react-redux';
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

class OnboardingWizard extends Component {
	static propTypes = {
		close: PropTypes.func,
		navigation: PropTypes.object,
		wizard: PropTypes.object
	};

	onboardingWizardNavigator = {
		1: <Step1 onClose={this.props.close} />,
		2: <Step2 onClose={this.props.close} />,
		3: <Step3 onClose={this.props.close} />,
		4: <Step4 onClose={this.props.close} navigation={this.props.navigation} />,
		5: <Step5 onClose={this.props.close} navigation={this.props.navigation} />,
		6: <Step6 onClose={this.props.close} />,
		7: <Step7 onClose={this.props.close} />
	};

	render() {
		const {
			wizard: { step }
		} = this.props;
		return (
			<View style={styles.root}>
				<View style={styles.main}>{this.onboardingWizardNavigator[step]}</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	wizard: state.wizard
});

export default connect(mapStateToProps)(OnboardingWizard);
