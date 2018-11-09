import React, { Component } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	root: {
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		flex: 1,
		position: 'relative',
		zIndex: 1,
		flexDirection: 'row',
		justifyContent: 'space-evenly'
	},
	selector: {
		alignSelf: 'stretch',
		textAlign: 'center',
		alignItems: 'center',
		width: '33%',
		padding: 5
	},
	average: {
		borderColor: colors.inputBorderColor,
		borderRightWidth: 1,
		borderLeftWidth: 1,
		backgroundColor: this.state ? colors.white : colors.black
	}
});

/**
 * Component that renders a selector to choose either fast, average or slow gas fee
 */
export default class CustomGas extends Component {
	state = {
		basicGasEstimates: {},
		gasFastSelected: false,
		gasAverageSelected: true,
		gasSlowSelected: false
	};

	onPressGasFast = () => {
		this.setState({ gasFastSelected: true, gasAverageSelected: false, gasSlowSelected: false });
	};

	onPressGasAverage = () => {
		this.setState({ gasFastSelected: false, gasAverageSelected: true, gasSlowSelected: false });
	};

	onPressGasSlow = () => {
		this.setState({ gasFastSelected: false, gasAverageSelected: false, gasSlowSelected: true });
	};

	componentDidMount = async () => {
		const basicGasEstimates = await this.fetchBasicGasEstimates();
		this.setState({ basicGasEstimates });
	};

	fetchBasicGasEstimates = async () =>
		await fetch('https://ethgasstation.info/json/ethgasAPI.json', {
			headers: {},
			referrer: 'http://ethgasstation.info/json/',
			referrerPolicy: 'no-referrer-when-downgrade',
			body: null,
			method: 'GET',
			mode: 'cors'
		})
			.then(r => r.json())
			.then(
				({
					average,
					avgWait,
					block_time: blockTime,
					blockNum,
					fast,
					fastest,
					fastestWait,
					fastWait,
					safeLow,
					safeLowWait,
					speed
				}) => {
					const basicEstimates = {
						average,
						avgWait,
						blockTime,
						blockNum,
						fast,
						fastest,
						fastestWait,
						fastWait,
						safeLow,
						safeLowWait,
						speed
					};
					return basicEstimates;
				}
			);

	render() {
		const {
			basicGasEstimates: { fast, fastWait, average, avgWait, safeLow, safeLowWait }
		} = this.state;

		return (
			<View style={styles.root}>
				<TouchableOpacity
					key={'fast'}
					onPress={this.onPressGasFast}
					style={{
						...styles.selector,
						...styles.fast,
						...{ backgroundColor: this.state.gasFastSelected ? colors.primary : colors.white }
					}}
				>
					<Text>{strings('transaction.gasFeeFast')}</Text>
					<Text>{fast}</Text>
					<Text>{fastWait}</Text>
				</TouchableOpacity>
				<TouchableOpacity
					key={'average'}
					onPress={this.onPressGasAverage}
					style={{
						...styles.selector,
						...styles.average,
						...{ backgroundColor: this.state.gasAverageSelected ? colors.primary : colors.white }
					}}
				>
					<Text>{strings('transaction.gasFeeAverage')}</Text>
					<Text>{average}</Text>
					<Text>{avgWait}</Text>
				</TouchableOpacity>
				<TouchableOpacity
					key={'safeLow'}
					onPress={this.onPressGasSlow}
					style={{
						...styles.selector,
						...styles.slow,
						...{ backgroundColor: this.state.gasSlowSelected ? colors.primary : colors.white }
					}}
				>
					<Text>{strings('transaction.gasFeeSlow')}</Text>
					<Text>{safeLow}</Text>
					<Text>{safeLowWait}</Text>
				</TouchableOpacity>
			</View>
		);
	}
}
