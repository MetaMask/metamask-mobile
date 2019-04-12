import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../../../styles/common';
import Tooltip from '../Tooltip';

const styles = StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: colors.dimmed
	}
});

export default class Step2 extends Component {
	static propTypes = {
		navigate: PropTypes.func,
		screenProps: PropTypes.object
	};

	onNext = () => {
		const { navigate } = this.props;
		navigate && navigate('Step3');
	};

	onBack = () => {
		const { navigate } = this.props;
		navigate && navigate('Step1');
	};

	onClose = () => {
		const { close } = this.props.screenProps;
		close && close();
	};

	render() {
		return (
			<SafeAreaView style={styles.main}>
				<Tooltip
					title={'OnboardingWizard Step2'}
					content={'Text test'}
					onNext={this.onNext}
					onBack={this.onBack}
					onClose={this.onClose}
				/>
			</SafeAreaView>
		);
	}
}
