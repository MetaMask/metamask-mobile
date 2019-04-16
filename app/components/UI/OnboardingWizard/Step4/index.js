import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import Tooltip from '../Tooltip';

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	some: {
		marginLeft: 10,
		marginRight: 85
	},
	tooltipContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 90
	}
});

export default class Step4 extends Component {
	static propTypes = {
		navigate: PropTypes.func,
		screenProps: PropTypes.object,
		navigation: PropTypes.object
	};

	onNext = () => {
		const { navigate, navigation } = this.props;
		navigation && navigation.openDrawer();
		navigate && navigate('Step5');
	};

	onBack = () => {
		const { navigate } = this.props;
		navigate && navigate('Step3');
	};

	onClose = () => {
		const { close } = this.props.screenProps;
		close && close();
	};

	render() {
		return (
			<View style={styles.main}>
				<View style={styles.tooltipContainer}>
					<Tooltip
						title={'Main Navigation'}
						content={
							'Tap here to access your Wallet, Browser, and Transaction history.\n\nYou can take more actionswith your accounts & access MetaMask settings.'
						}
						onNext={this.onNext}
						onBack={this.onBack}
						onClose={this.onClose}
						style={styles.some}
						topIndicatorPosition={'topLeft'}
						currentStep={3}
					/>
				</View>
			</View>
		);
	}
}
