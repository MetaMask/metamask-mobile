import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import { getRenderableEthGasFee, getRenderableFiatGasFee, apiEstimateModifiedToWEI } from '../../util/custom-gas';
import { BN } from 'ethereumjs-util';
import { fromWei } from '../../util/number';

const styles = StyleSheet.create({
	root: {
		flex: 1
	},
	selectors: {
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
	advancedOptions: {
		textAlign: 'right',
		alignItems: 'flex-end',
		marginTop: 5
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
	},
	textTotalGas: {
		...fontStyles.bold
	},
	textAdvancedOptions: {
		color: colors.primary
	},
	gasInput: {
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		fontSize: 16,
		paddingBottom: 8,
		paddingLeft: 10,
		paddingRight: 52,
		paddingTop: 8,
		position: 'relative',
		marginTop: 5
	},
	warningText: {
		color: colors.error,
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
		handleGasFeeSelection: PropTypes.func,
		/**
		 * Object BN containing total gas fee
		 */
		totalGas: PropTypes.object
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
		selected: 'average',
		didMount: false,
		advancedCustomGas: false,
		customGasPrice: '20',
		customGasLimit: '21000',
		warningGasLimit: '',
		warningGasPrice: '',
		fixedGasLimit: new BN((21000).toString(), 10)
	};

	onPressGasFast = () => {
		const { fastGwei, fixedGasLimit } = this.state;
		this.setState({ gasFastSelected: true, gasAverageSelected: false, gasSlowSelected: false, selected: 'fast' });
		this.props.handleGasFeeSelection(fixedGasLimit, apiEstimateModifiedToWEI(fastGwei));
	};

	onPressGasAverage = () => {
		const { averageGwei, fixedGasLimit } = this.state;
		this.setState({
			gasFastSelected: false,
			gasAverageSelected: true,
			gasSlowSelected: false,
			selected: 'average'
		});
		this.props.handleGasFeeSelection(fixedGasLimit, apiEstimateModifiedToWEI(averageGwei));
	};

	onPressGasSlow = () => {
		const { safeLowGwei, fixedGasLimit } = this.state;
		this.setState({ gasFastSelected: false, gasAverageSelected: false, gasSlowSelected: true, selected: 'slow' });
		this.props.handleGasFeeSelection(fixedGasLimit, apiEstimateModifiedToWEI(safeLowGwei));
	};

	onAdvancedOptions = () => {
		const {
			advancedCustomGas,
			selected,
			fastGwei,
			averageGwei,
			safeLowGwei,
			fixedGasLimit,
			customGasLimit,
			customGasPrice
		} = this.state;
		if (advancedCustomGas) {
			switch (selected) {
				case 'slow':
					this.props.handleGasFeeSelection(fixedGasLimit, apiEstimateModifiedToWEI(safeLowGwei));
					break;
				case 'average':
					this.props.handleGasFeeSelection(fixedGasLimit, apiEstimateModifiedToWEI(averageGwei));
					break;
				case 'fast':
					this.props.handleGasFeeSelection(fixedGasLimit, apiEstimateModifiedToWEI(fastGwei));
					break;
			}
		} else {
			this.props.handleGasFeeSelection(new BN(customGasLimit), apiEstimateModifiedToWEI(customGasPrice));
		}
		this.setState({ advancedCustomGas: !advancedCustomGas });
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

	onGasLimitChange = value => {
		const { customGasPrice } = this.state;
		this.validateGasLimit(new BN(value));
		this.setState({ customGasLimit: value });
		this.props.handleGasFeeSelection(new BN(value, 10), apiEstimateModifiedToWEI(customGasPrice));
	};

	validateGasLimit = value => {
		if (value.lt(new BN(21000)) || value.gt(new BN(7920028))) {
			this.setState({ warningGasLimit: strings('customGas.warningGasLimit'), customGasLimit: '21000' });
		} else {
			this.setState({ warningGasLimit: '' });
		}
	};

	onGasPriceChange = value => {
		const { customGasLimit } = this.state;
		this.setState({ customGasPrice: value });
		this.props.handleGasFeeSelection(new BN(customGasLimit, 10), apiEstimateModifiedToWEI(value));
	};

	renderCustomGasSelector = () => {
		const { averageEth, averageFiat, fastEth, fastFiat, safeLowEth, safeLowFiat } = this.state;
		return (
			<View style={styles.selectors}>
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
	};

	renderCustomGasInput = () => {
		const { customGasLimit, customGasPrice, warningGasLimit, warningGasPrice } = this.state;
		const { totalGas } = this.props;
		return (
			<View>
				<Text style={styles.textTotalGas}>{fromWei(totalGas.toString())} ETH</Text>
				<Text style={styles.text}>{strings('customGas.gasLimit')}</Text>
				<TextInput
					keyboardType="numeric"
					style={styles.gasInput}
					onChangeText={this.onGasLimitChange}
					value={customGasLimit}
				/>
				<Text style={styles.warningText}>{warningGasLimit}</Text>
				<Text style={styles.text}>{strings('customGas.gasPrice')}</Text>
				<TextInput
					keyboardType="numeric"
					style={styles.gasInput}
					onChangeText={this.onGasPriceChange}
					value={customGasPrice}
				/>
				<Text style={styles.text}>{warningGasPrice}</Text>
			</View>
		);
	};

	render() {
		if (this.state.didMount) {
			const { advancedCustomGas } = this.state;
			return (
				<View style={styles.root}>
					{advancedCustomGas ? this.renderCustomGasInput() : this.renderCustomGasSelector()}
					<View style={styles.advancedOptions}>
						<TouchableOpacity onPress={this.onAdvancedOptions}>
							<Text style={styles.textAdvancedOptions}>
								{advancedCustomGas
									? strings('customGas.hideAdvancedOptions')
									: strings('customGas.advancedOptions')}
							</Text>
						</TouchableOpacity>
					</View>
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
