import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import {
	getRenderableEthGasFee,
	getRenderableFiatGasFee,
	apiEstimateModifiedToWEI,
	fetchBasicGasEstimates
} from '../../util/custom-gas';
import { BN } from 'ethereumjs-util';
import { fromWei } from '../../util/number';

const styles = StyleSheet.create({
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
		...fontStyles.normal,
		fontSize: 12
	},
	textTitle: {
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
		totalGas: PropTypes.object,
		/**
		 * Object BN containing estimated gas limit
		 */
		gas: PropTypes.object
	};

	state = {
		basicGasEstimates: {},
		gasFastSelected: false,
		gasAverageSelected: true,
		gasSlowSelected: false,
		averageGwei: 0,
		fastGwei: 0,
		safeLowGwei: 0,
		selected: 'average',
		ready: false,
		advancedCustomGas: false,
		customGasPrice: '20',
		customGasLimit: '21000',
		warningGasLimit: '',
		warningGasPrice: ''
	};

	onPressGasFast = () => {
		const { fastGwei } = this.state;
		const { gas } = this.props;
		this.setState({ gasFastSelected: true, gasAverageSelected: false, gasSlowSelected: false, selected: 'fast' });
		this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(fastGwei));
	};

	onPressGasAverage = () => {
		const { averageGwei } = this.state;
		const { gas } = this.props;
		this.setState({
			gasFastSelected: false,
			gasAverageSelected: true,
			gasSlowSelected: false,
			selected: 'average'
		});
		this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(averageGwei));
	};

	onPressGasSlow = () => {
		const { safeLowGwei } = this.state;
		const { gas } = this.props;
		this.setState({ gasFastSelected: false, gasAverageSelected: false, gasSlowSelected: true, selected: 'slow' });
		this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(safeLowGwei));
	};

	onAdvancedOptions = () => {
		const {
			advancedCustomGas,
			selected,
			fastGwei,
			averageGwei,
			safeLowGwei,
			customGasLimit,
			customGasPrice
		} = this.state;
		const { gas } = this.props;
		if (advancedCustomGas) {
			switch (selected) {
				case 'slow':
					this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(safeLowGwei));
					break;
				case 'average':
					this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(averageGwei));
					break;
				case 'fast':
					this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(fastGwei));
					break;
			}
		} else {
			this.props.handleGasFeeSelection(new BN(customGasLimit), apiEstimateModifiedToWEI(customGasPrice));
		}
		this.setState({ advancedCustomGas: !advancedCustomGas });
	};

	componentDidMount = async () => {
		await this.handleFetchBasicEstimates();
		this.onPressGasAverage();
	};

	handleFetchBasicEstimates = async () => {
		this.setState({ ready: false });
		const basicGasEstimates = await fetchBasicGasEstimates();
		const { average, fast, safeLow } = basicGasEstimates;
		this.setState({
			averageGwei: average,
			fastGwei: fast,
			safeLowGwei: safeLow,
			ready: true
		});
	};

	onGasLimitChange = value => {
		const { customGasPrice } = this.state;
		const bnValue = new BN(value);
		this.setState({ customGasLimit: value });
		this.props.handleGasFeeSelection(bnValue, apiEstimateModifiedToWEI(customGasPrice));
	};

	onGasPriceChange = value => {
		const { customGasLimit } = this.state;
		this.setState({ customGasPrice: value });
		this.props.handleGasFeeSelection(new BN(customGasLimit, 10), apiEstimateModifiedToWEI(value));
	};

	renderCustomGasSelector = () => {
		const { averageGwei, fastGwei, safeLowGwei } = this.state;
		const { conversionRate, currentCurrency, gas } = this.props;
		return (
			<View style={styles.selectors}>
				<TouchableOpacity
					key={'fast'}
					onPress={this.onPressGasFast}
					style={[
						styles.selector,
						styles.fast,
						{ backgroundColor: this.state.gasFastSelected ? colors.primary : colors.white }
					]}
				>
					<Text style={[styles.textTitle, { color: this.state.gasFastSelected ? colors.white : undefined }]}>
						{strings('transaction.gas_fee_fast')}
					</Text>
					<Text style={[styles.text, { color: this.state.gasFastSelected ? colors.white : undefined }]}>
						{getRenderableEthGasFee(fastGwei, gas)} ETH
					</Text>
					<Text style={[styles.text, { color: this.state.gasFastSelected ? colors.white : undefined }]}>
						{getRenderableFiatGasFee(fastGwei, conversionRate, currentCurrency, gas).toUpperCase()}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					key={'average'}
					onPress={this.onPressGasAverage}
					style={[
						styles.selector,
						styles.average,
						{ backgroundColor: this.state.gasAverageSelected ? colors.primary : colors.white }
					]}
				>
					<Text
						style={[styles.textTitle, { color: this.state.gasAverageSelected ? colors.white : undefined }]}
					>
						{strings('transaction.gas_fee_average')}
					</Text>
					<Text style={[styles.text, { color: this.state.gasAverageSelected ? colors.white : undefined }]}>
						{getRenderableEthGasFee(averageGwei, gas)} ETH
					</Text>
					<Text style={[styles.text, { color: this.state.gasAverageSelected ? colors.white : undefined }]}>
						{getRenderableFiatGasFee(averageGwei, conversionRate, currentCurrency, gas).toUpperCase()}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					key={'safeLow'}
					onPress={this.onPressGasSlow}
					style={[
						styles.selector,
						styles.slow,
						{ backgroundColor: this.state.gasSlowSelected ? colors.primary : colors.white }
					]}
				>
					<Text style={[styles.textTitle, { color: this.state.gasSlowSelected ? colors.white : undefined }]}>
						{strings('transaction.gas_fee_slow')}
					</Text>
					<Text style={[styles.text, { color: this.state.gasSlowSelected ? colors.white : undefined }]}>
						{getRenderableEthGasFee(safeLowGwei, gas)} ETH
					</Text>
					<Text style={[styles.text, { color: this.state.gasSlowSelected ? colors.white : undefined }]}>
						{getRenderableFiatGasFee(safeLowGwei, conversionRate, currentCurrency, gas).toUpperCase()}
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
				<Text style={styles.text}>{strings('custom_gas.gas_limit')}</Text>
				<TextInput
					keyboardType="numeric"
					style={styles.gasInput}
					onChangeText={this.onGasLimitChange}
					value={customGasLimit}
				/>
				<Text style={styles.warningText}>{warningGasLimit}</Text>
				<Text style={styles.text}>{strings('custom_gas.gas_price')}</Text>
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

	render = () => {
		if (this.state.ready) {
			const { advancedCustomGas } = this.state;
			return (
				<View style={baseStyles.flexGrow}>
					{advancedCustomGas ? this.renderCustomGasInput() : this.renderCustomGasSelector()}
					<View style={styles.advancedOptions}>
						<TouchableOpacity onPress={this.onAdvancedOptions}>
							<Text style={styles.textAdvancedOptions}>
								{advancedCustomGas
									? strings('custom_gas.hide_advanced_options')
									: strings('custom_gas.advanced_options')}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			);
		}
		return (
			<View style={baseStyles.flexGrow}>
				<Text>{strings('transaction.loading')}</Text>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.backgroundState.CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(CustomGas);
