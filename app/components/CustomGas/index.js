import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import { getRenderableEthFee, getRenderableGweiFiat } from '../../util/custom-gas';

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
		alignItems: 'flex-start',
		width: '33%',
		padding: 5
	},
	average: {
		borderColor: colors.inputBorderColor,
		borderRightWidth: 1,
		borderLeftWidth: 1
	},
	slow: {
		borderBottomEndRadius: 4,
		borderTopEndRadius: 4
	},
	fast: {
		borderBottomStartRadius: 4,
		borderTopStartRadius: 4
	},
	text: {
		...fontStyles.normal
	}
});

/**
 * Component that renders a selector to choose either fast, average or slow gas fee
 */
class CustomGas extends Component {
	static propTypes = {
		/**
		/* conversion rate of ETH - FIAT
		*/
		conversionRate: PropTypes.any,
		/**
		/* Selected currency
		*/
		currentCurrency: PropTypes.string
	};

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
			basicGasEstimates: { fast, average, safeLow }
		} = this.state;
		const { conversionRate, currentCurrency } = this.props;

		if (fast && average && safeLow) {
			const averageEth = getRenderableEthFee(average) + ' ETH';
			const fastEth = getRenderableEthFee(fast) + ' ETH';
			const safeLowEth = getRenderableEthFee(safeLow) + ' ETH';
			const averageFiat = getRenderableGweiFiat(average, conversionRate, currentCurrency);
			const fastFiat = getRenderableGweiFiat(fast, conversionRate, currentCurrency);
			const safeLowFiat = getRenderableGweiFiat(safeLow, conversionRate, currentCurrency);
			return (
				<View style={styles.root}>
					<TouchableOpacity
						key={'fast'}
						onPress={this.onPressGasFast}
						style={{
							...styles.selector,
							...styles.fast,
							...{
								backgroundColor: this.state.gasFastSelected ? colors.primary : colors.white
							}
						}}
					>
						<Text
							style={{
								...styles.text,
								...{ color: this.state.gasFastSelected ? colors.white : undefined }
							}}
						>
							{strings('transaction.gasFeeFast')}
						</Text>
						<Text
							style={{
								...styles.text,
								...{ color: this.state.gasFastSelected ? colors.white : undefined }
							}}
						>
							{fastEth}
						</Text>
						<Text
							style={{
								...styles.text,
								...{ color: this.state.gasFastSelected ? colors.white : undefined }
							}}
						>
							{fastFiat}
						</Text>
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
						<Text
							style={{
								...styles.text,
								...{ color: this.state.gasAverageSelected ? colors.white : undefined }
							}}
						>
							{strings('transaction.gasFeeAverage')}
						</Text>
						<Text
							style={{
								...styles.text,
								...{ color: this.state.gasAverageSelected ? colors.white : undefined }
							}}
						>
							{averageEth}
						</Text>
						<Text
							style={{
								...styles.text,
								...{ color: this.state.gasAverageSelected ? colors.white : undefined }
							}}
						>
							{averageFiat}
						</Text>
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
						<Text
							style={{
								...styles.text,
								...{ color: this.state.gasSlowSelected ? colors.white : undefined }
							}}
						>
							{strings('transaction.gasFeeSlow')}
						</Text>
						<Text
							style={{
								...styles.text,
								...{ color: this.state.gasSlowSelected ? colors.white : undefined }
							}}
						>
							{safeLowEth}
						</Text>
						<Text
							style={{
								...styles.text,
								...{ color: this.state.gasSlowSelected ? colors.white : undefined }
							}}
						>
							{safeLowFiat}
						</Text>
					</TouchableOpacity>
				</View>
			);
		}
		return (
			<View style={styles.root}>
				<Text>Loading ...</Text>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	conversionRate: state.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.backgroundState.CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(CustomGas);
