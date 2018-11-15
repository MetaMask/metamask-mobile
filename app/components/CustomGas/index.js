import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import { getRenderableEthGasFee, getRenderableFiatGasFee, apiEstimateModifiedToWEI } from '../../util/custom-gas';
import { BN } from 'ethereumjs-util';

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
		currentCurrency: PropTypes.string,
		/**
		 * Callback triggered when gas fee is selected
		 */
		handleGasFeeSelection: PropTypes.func
	};

	state = {
		basicGasEstimates: {},
		gasFastSelected: false,
		gasAverageSelected: true,
		gasSlowSelected: false,
		averageEth: 0,
		fastEth: 0,
		safeLowEth: 0,
		averageFiat: 0,
		fastFiat: 0,
		safeLowFiat: 0,
		averageGwei: 0,
		fastGwei: 0,
		safeLowGwei: 0,
		didMount: false
	};

	onPressGasFast = () => {
		const { handleGasFeeSelection } = this.props;
		const { fastGwei } = this.state;
		this.setState({ gasFastSelected: true, gasAverageSelected: false, gasSlowSelected: false });
		handleGasFeeSelection(new BN((21000).toString(), 10), apiEstimateModifiedToWEI(fastGwei));
	};

	onPressGasAverage = () => {
		const { handleGasFeeSelection } = this.props;
		const { averageGwei } = this.state;
		this.setState({ gasFastSelected: false, gasAverageSelected: true, gasSlowSelected: false });
		handleGasFeeSelection(new BN((21000).toString(), 10), apiEstimateModifiedToWEI(averageGwei));
	};

	onPressGasSlow = () => {
		const { handleGasFeeSelection } = this.props;
		const { safeLowGwei } = this.state;
		this.setState({ gasFastSelected: false, gasAverageSelected: false, gasSlowSelected: true });
		handleGasFeeSelection(new BN((21000).toString(), 10), apiEstimateModifiedToWEI(safeLowGwei));
	};

	componentDidMount = async () => {
		const basicGasEstimates = await this.fetchBasicGasEstimates();
		const { average, fast, safeLow } = basicGasEstimates;
		const { conversionRate, currentCurrency } = this.props;
		this.setState({
			averageEth: getRenderableEthGasFee(average) + ' ETH',
			fastEth: getRenderableEthGasFee(fast) + ' ETH',
			safeLowEth: getRenderableEthGasFee(safeLow) + ' ETH',
			averageFiat: getRenderableFiatGasFee(average, conversionRate, currentCurrency),
			fastFiat: getRenderableFiatGasFee(fast, conversionRate, currentCurrency),
			safeLowFiat: getRenderableFiatGasFee(safeLow, conversionRate, currentCurrency),
			averageGwei: average,
			fastGwei: fast,
			safeLowGwei: safeLow,
			didMount: true
		});
		this.onPressGasAverage();
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
		if (this.state.didMount) {
			const { averageEth, averageFiat, fastEth, fastFiat, safeLowEth, safeLowFiat } = this.state;
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
							{fastFiat.toUpperCase()}
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
							{averageFiat.toUpperCase()}
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
							{safeLowFiat.toUpperCase()}
						</Text>
					</TouchableOpacity>
				</View>
			);
		}
		return (
			<View style={styles.root}>
				<Text>{strings('transaction.loading')}</Text>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	conversionRate: state.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.backgroundState.CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(CustomGas);
