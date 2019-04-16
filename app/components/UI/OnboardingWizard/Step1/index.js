import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import Tooltip from '../Tooltip';
import DeviceSize from '../../../../util/DeviceSize';

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	toolTip: {
		marginHorizontal: 16
	},
	tooltipContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: DeviceSize.isIphoneX() ? 36 : 16
	}
});

export default class Step1 extends Component {
	static propTypes = {
		navigate: PropTypes.func,
		onClose: PropTypes.func
	};

	onNext = () => {
		const { navigate } = this.props;
		navigate && navigate('Step2');
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
				<View style={styles.tooltipContainer}>
					<Tooltip
						title={'Welcome to your new wallet!'}
						content={
							'To use blockchain applications (DAPPS) you need a wallet because blockchain actions cost Ether (ETH). \n\n To use blockchain applications (DAPPS) you need a wallet because blockchain actions cost Ether (ETH)'
						}
						onNext={this.onNext}
						onBack={this.onBack}
						onClose={this.onClose}
						tooltipStyle={styles.toolTip}
						action
					/>
				</View>
			</View>
		);
	}
}
