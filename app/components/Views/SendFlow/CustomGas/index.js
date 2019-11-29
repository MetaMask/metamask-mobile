import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import {
	getRenderableEthGasFee,
	getRenderableFiatGasFee,
	apiEstimateModifiedToWEI,
	fetchBasicGasEstimates,
	convertApiValueToGWEI
} from '../../../../util/custom-gas';
import { BN } from 'ethereumjs-util';
import { fromWei, renderWei, hexToBN } from '../../../../util/number';
import Logger from '../../../../util/Logger';
import { getTicker } from '../../../../util/transactions';
import DeviceSize from '../../../../util/DeviceSize';

const AVERAGE_GAS = 20;
const LOW_GAS = 10;
const FAST_GAS = 40;

const styles = StyleSheet.create({
	root: {
		margin: 16
	},
	selectors: {
		backgroundColor: colors.white,
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	selector: {
		flex: 1,
		textAlign: 'center',
		alignItems: 'flex-start',
		padding: 12,
		borderWidth: 1,
		borderRadius: 6,
		borderColor: colors.grey100,
		marginVertical: 16
	},
	selectorCenter: {
		marginHorizontal: 8
	},
	advancedOptions: {
		textAlign: 'right',
		alignItems: 'center'
	},
	text: {
		...fontStyles.light,
		fontSize: DeviceSize.isSmallDevice() ? 8 : 10,
		textTransform: 'uppercase'
	},
	textTime: {
		...fontStyles.bold,
		marginVertical: 8,
		fontSize: DeviceSize.isSmallDevice() ? 8 : 10
	},
	textTitle: {
		...fontStyles.light,
		fontSize: DeviceSize.isSmallDevice() ? 8 : 10,
		textTransform: 'uppercase'
	},
	textTotalGas: {
		...fontStyles.bold,
		marginBottom: 8,
		marginTop: 4
	},
	textAdvancedOptions: {
		color: colors.blue
	},
	gasInput: {
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderRadius: 4,
		borderWidth: 1,
		fontSize: 16,
		paddingHorizontal: 10,
		paddingVertical: 8,
		position: 'relative',
		marginTop: 4
	},
	warningText: {
		color: colors.red,
		...fontStyles.normal
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	selectorSelected: {
		backgroundColor: colors.blue000,
		borderColor: colors.blue
	},
	selectorNotSelected: {
		backgroundColor: colors.white,
		borderColor: colors.grey500
	},
	advancedOptionsContainer: {
		marginTop: 16
	}
});

/**
 * PureComponent that renders a selector to choose either fast, average or slow gas fee
 */
class CustomGas extends PureComponent {
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
		 * Object BN containing estimated gas limit
		 */
		gas: PropTypes.object,
		/**
		 * Object BN containing estimated gas price
		 */
		gasPrice: PropTypes.object,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Current selector selected
		 */
		selected: PropTypes.string
	};

	state = {
		basicGasEstimates: {},
		gasFastSelected: this.props.selected === 'fast',
		gasAverageSelected: this.props.selected === 'average',
		gasSlowSelected: this.props.selected === 'slow',
		averageGwei: 0,
		fastGwei: 0,
		safeLowGwei: 0,
		selected: this.props.selected,
		ready: false,
		advancedCustomGas: false,
		customGasPrice: fromWei(this.props.gasPrice, 'gwei'),
		customGasLimit: fromWei(this.props.gas),
		customGasPriceBN: this.props.gasPrice,
		customGasLimitBN: this.props.gas,
		warningGasLimit: '',
		warningGasPrice: ''
	};

	onPressGasFast = () => {
		const { fastGwei } = this.state;
		const { gas } = this.props;
		this.setState({
			gasFastSelected: true,
			gasAverageSelected: false,
			gasSlowSelected: false,
			selected: 'fast',
			customGasPrice: fastGwei
		});
		this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(fastGwei), 'fast');
	};

	onPressGasAverage = () => {
		const { averageGwei } = this.state;
		const { gas } = this.props;
		this.setState({
			gasFastSelected: false,
			gasAverageSelected: true,
			gasSlowSelected: false,
			selected: 'average',
			customGasPrice: averageGwei
		});
		this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(averageGwei), 'average');
	};

	onPressGasSlow = () => {
		const { safeLowGwei } = this.state;
		const { gas } = this.props;
		this.setState({
			gasFastSelected: false,
			gasAverageSelected: false,
			gasSlowSelected: true,
			selected: 'slow',
			customGasPrice: safeLowGwei
		});
		this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(safeLowGwei), 'slow');
	};

	onAdvancedOptions = () => {
		const { advancedCustomGas, selected, fastGwei, averageGwei, safeLowGwei, customGasPrice } = this.state;
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
			this.setState({ customGasLimit: fromWei(gas, 'wei') });
			this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(customGasPrice));
		}
		this.setState({ advancedCustomGas: !advancedCustomGas });
	};

	componentDidMount = async () => {
		await this.handleFetchBasicEstimates();
		const { ticker } = this.props;
		if (ticker && ticker !== 'ETH') {
			this.setState({ advancedCustomGas: true });
		}
	};

	componentDidUpdate = prevProps => {
		if (this.state.advancedCustomGas) {
			this.handleGasRecalculationForCustomGasInput(prevProps);
		}
	};

	handleGasRecalculationForCustomGasInput = prevProps => {
		const actualGasLimitWei = renderWei(hexToBN(this.props.gas));
		if (renderWei(hexToBN(prevProps.gas)) !== actualGasLimitWei) {
			this.setState({ customGasLimit: actualGasLimitWei });
		}
	};

	handleFetchBasicEstimates = async () => {
		this.setState({ ready: false });
		let basicGasEstimates;
		try {
			basicGasEstimates = await fetchBasicGasEstimates();
		} catch (error) {
			Logger.log('Error while trying to get gas limit estimates', error);
			basicGasEstimates = { average: AVERAGE_GAS, safeLow: LOW_GAS, fast: FAST_GAS };
		}

		// Handle api failure returning same gas prices
		let { average, fast, safeLow } = basicGasEstimates;
		if (average === fast && average === safeLow) {
			average = AVERAGE_GAS;
			safeLow = LOW_GAS;
			fast = FAST_GAS;
		}

		this.setState({
			averageGwei: convertApiValueToGWEI(average),
			fastGwei: convertApiValueToGWEI(fast),
			safeLowGwei: convertApiValueToGWEI(safeLow),
			ready: true
		});
	};

	onGasLimitChange = value => {
		const { customGasPrice } = this.state;
		const bnValue = new BN(value);
		this.setState({ customGasLimit: value, customGasLimitBN: bnValue });
		this.props.handleGasFeeSelection(bnValue, apiEstimateModifiedToWEI(customGasPrice));
	};

	onGasPriceChange = value => {
		const { customGasLimit } = this.state;
		this.setState({ customGasPrice: value, customGasPriceBN: apiEstimateModifiedToWEI(value) });
		this.props.handleGasFeeSelection(new BN(customGasLimit, 10), apiEstimateModifiedToWEI(value));
	};

	renderCustomGasSelector = () => {
		const { averageGwei, fastGwei, safeLowGwei, gasSlowSelected, gasAverageSelected, gasFastSelected } = this.state;
		const { conversionRate, currentCurrency, gas } = this.props;
		const ticker = getTicker(this.props.ticker);
		return (
			<View style={styles.selectors}>
				<TouchableOpacity
					key={'safeLow'}
					onPress={this.onPressGasSlow}
					style={[styles.selector, gasSlowSelected ? styles.selectorSelected : styles.selectorNotSelected]}
				>
					<Text style={styles.textTitle}>{strings('transaction.gas_fee_slow')}</Text>
					<Text style={[styles.text, styles.textTime]}>10 min</Text>
					<Text style={styles.text}>
						{getRenderableEthGasFee(safeLowGwei, gas)} {ticker}
					</Text>
					<Text style={styles.text}>
						{getRenderableFiatGasFee(safeLowGwei, conversionRate, currentCurrency, gas)}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					key={'average'}
					onPress={this.onPressGasAverage}
					style={[
						styles.selector,
						styles.selectorCenter,
						gasAverageSelected ? styles.selectorSelected : styles.selectorNotSelected
					]}
				>
					<Text style={styles.textTitle}>{strings('transaction.gas_fee_average')}</Text>
					<Text style={[styles.text, styles.textTime]}>5 min</Text>
					<Text style={styles.text}>
						{getRenderableEthGasFee(averageGwei, gas)} {ticker}
					</Text>
					<Text style={styles.text}>
						{getRenderableFiatGasFee(averageGwei, conversionRate, currentCurrency, gas)}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					key={'fast'}
					onPress={this.onPressGasFast}
					style={[styles.selector, gasFastSelected ? styles.selectorSelected : styles.selectorNotSelected]}
				>
					<Text style={styles.textTitle}>{strings('transaction.gas_fee_fast')}</Text>
					<Text style={[styles.text, styles.textTime]}>1 min</Text>
					<Text style={styles.text}>
						{getRenderableEthGasFee(fastGwei, gas)} {ticker}
					</Text>
					<Text style={styles.text}>
						{getRenderableFiatGasFee(fastGwei, conversionRate, currentCurrency, gas)}
					</Text>
				</TouchableOpacity>
			</View>
		);
	};

	renderCustomGasInput = () => {
		const {
			customGasLimit,
			customGasPrice,
			warningGasLimit,
			warningGasPrice,
			customGasLimitBN,
			customGasPriceBN
		} = this.state;
		const ticker = getTicker(this.props.ticker);
		const totalGas = customGasLimitBN.mul(customGasPriceBN);
		return (
			<View style={styles.advancedOptionsContainer}>
				<Text style={styles.text}>Total</Text>
				<Text style={styles.textTotalGas}>
					{fromWei(totalGas)} {ticker}
				</Text>
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
				<View style={styles.root}>
					<Text>This is the cost for processing this payment on the blockchain.</Text>
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
			<View style={styles.loader}>
				<ActivityIndicator style={styles.loader} size="small" />
			</View>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker
});

export default connect(mapStateToProps)(CustomGas);
