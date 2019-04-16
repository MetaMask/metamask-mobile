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
		top: 200
	}
});

export default class Step3 extends Component {
	static propTypes = {
		navigate: PropTypes.func,
		screenProps: PropTypes.object
	};

	onNext = () => {
		const { navigate } = this.props;
		navigate && navigate('Step4');
	};

	onBack = () => {
		const { navigate } = this.props;
		navigate && navigate('Step2');
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
