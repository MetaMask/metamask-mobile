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

export default class Step7 extends Component {
	static propTypes = {
		navigate: PropTypes.func,
		onClose: PropTypes.func
	};

	onNext = () => {
		this.onClose();
	};

	onBack = () => {
		const { navigate } = this.props;
		navigate && navigate('Step6');
	};

	onClose = () => {
		const { onClose } = this.props;
		onClose && onClose();
	};

	render() {
		return (
			<SafeAreaView style={styles.main}>
				<Tooltip
					title={'OnboardingWizard Step7'}
					content={'Text test'}
					onNext={this.onNext}
					onBack={this.onBack}
					onClose={this.onClose}
				/>
			</SafeAreaView>
		);
	}
}
