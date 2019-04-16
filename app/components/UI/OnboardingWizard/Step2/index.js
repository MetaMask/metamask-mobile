import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import Tooltip from '../Tooltip';

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	some: {
		marginHorizontal: 45
	},
	tooltipContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 280
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
			<View style={styles.main}>
				<View style={styles.tooltipContainer}>
					<Tooltip
						title={'Your Accounts'}
						content={
							'This is your first account, total value, and its unique public address (0x...).\n\nYou can create multiple accounts withinthis wallet by typing on profile icon.'
						}
						onNext={this.onNext}
						onBack={this.onBack}
						onClose={this.onClose}
						style={styles.some}
						topIndicatorPosition={'topCenter'}
					/>
				</View>
			</View>
		);
	}
}
