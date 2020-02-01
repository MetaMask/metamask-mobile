import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import {
	getRenderableEthGasFee,
	getRenderableFiatGasFee,
	apiEstimateModifiedToWEI,
	fetchBasicGasEstimates,
	convertApiValueToGWEI
} from '../../../util/custom-gas';
import { BN } from 'ethereumjs-util';
import { fromWei, renderWei, hexToBN } from '../../../util/number';
import Logger from '../../../util/Logger';
import { getTicker } from '../../../util/transactions';
import DeviceSize from '../../../util/DeviceSize';
import TransactionTypes from '../../../core/TransactionTypes';

const {
	CUSTOM_GAS: { AVERAGE_GAS, FAST_GAS, LOW_GAS }
} = TransactionTypes;

const styles = StyleSheet.create({
	selectors: {
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderRadius: 4,
		borderWidth: 1,
		flex: 1,
		position: 'relative',
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
		marginTop: 10
	},
	average: {
		borderColor: colors.grey100,
		borderRightWidth: 1,
		borderLeftWidth: 1
	},
	slow: {
		borderBottomStartRadius: 4,
		borderTopStartRadius: 4
	},
	fast: {
		borderBottomEndRadius: 4,
		borderTopEndRadius: 4
	},
	text: {
		...fontStyles.normal,
		fontSize: DeviceSize.isSmallDevice() ? 10 : 12
	},
	textTitle: {
		...fontStyles.bold,
		fontSize: DeviceSize.isSmallDevice() ? 10 : 14
	},
	textTotalGas: {
		...fontStyles.bold
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
		paddingBottom: 8,
		paddingLeft: 10,
		paddingRight: 52,
		paddingTop: 8,
		position: 'relative',
		marginTop: 5
	},
	warningText: {
		color: colors.red,
		...fontStyles.normal
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
		 * Object BN containing total gas fee
		 */
		totalGas: PropTypes.object,
		/**
		 * Object BN containing estimated gas limit
		 */
		gas: PropTypes.object,
		/**
		 * Callback to modify state in parent state
		 */
		onPress: PropTypes.func,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string
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
		customGasPrice: '10',
		customGasLimit: fromWei(this.props.gas, 'wei'),
		warningGasLimit: '',
		warningGasPrice: ''
	};

	onPressGasFast = () => {
		const { fastGwei } = this.state;
		const { gas, onPress } = this.props;
		onPress && onPress();
		this.setState({
			gasFastSelected: true,
			gasAverageSelected: false,
			gasSlowSelected: false,
			selected: 'fast',
			customGasPrice: fastGwei
		});
		this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(fastGwei));
	};

	onPressGasAverage = () => {
		const { averageGwei } = this.state;
		const { gas, onPress } = this.props;
		onPress && onPress();
		this.setState({
			gasFastSelected: false,
			gasAverageSelected: true,
			gasSlowSelected: false,
			selected: 'average',
			customGasPrice: averageGwei
		});
		this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(averageGwei));
	};

	onPressGasSlow = () => {
		const { safeLowGwei } = this.state;
		const { gas, onPress } = this.props;
		onPress && onPress();
		this.setState({
			gasFastSelected: false,
			gasAverageSelected: false,
			gasSlowSelected: true,
			selected: 'slow',
			customGasPrice: safeLowGwei
		});
		this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(safeLowGwei));
	};

	onAdvancedOptions = () => {
		const { advancedCustomGas, selected, fastGwei, averageGwei, safeLowGwei, customGasPrice } = this.state;
		const { gas, onPress } = this.props;
		onPress && onPress();
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
		const ticker = getTicker(this.props.ticker);
		return (
			<View style={styles.selectors}>
				<TouchableOpacity
					key={'safeLow'}
					onPress={this.onPressGasSlow}
					style={[
						styles.selector,
						styles.slow,
						{ backgroundColor: this.state.gasSlowSelected ? colors.blue : colors.white }
					]}
				>
					<Text style={[styles.textTitle, { color: this.state.gasSlowSelected ? colors.white : undefined }]}>
						{strings('transaction.gas_fee_slow')}
					</Text>
					<Text style={[styles.text, { color: this.state.gasSlowSelected ? colors.white : undefined }]}>
						{getRenderableEthGasFee(safeLowGwei, gas)} {ticker}
					</Text>
					<Text style={[styles.text, { color: this.state.gasSlowSelected ? colors.white : undefined }]}>
						{getRenderableFiatGasFee(safeLowGwei, conversionRate, currentCurrency, gas)}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					key={'average'}
					onPress={this.onPressGasAverage}
					style={[
						styles.selector,
						styles.average,
						{ backgroundColor: this.state.gasAverageSelected ? colors.blue : colors.white }
					]}
				>
					<Text
						style={[styles.textTitle, { color: this.state.gasAverageSelected ? colors.white : undefined }]}
					>
						{strings('transaction.gas_fee_average')}
					</Text>
					<Text style={[styles.text, { color: this.state.gasAverageSelected ? colors.white : undefined }]}>
						{getRenderableEthGasFee(averageGwei, gas)} {ticker}
					</Text>
					<Text style={[styles.text, { color: this.state.gasAverageSelected ? colors.white : undefined }]}>
						{getRenderableFiatGasFee(averageGwei, conversionRate, currentCurrency, gas)}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					key={'fast'}
					onPress={this.onPressGasFast}
					style={[
						styles.selector,
						styles.fast,
						{ backgroundColor: this.state.gasFastSelected ? colors.blue : colors.white }
					]}
				>
					<Text style={[styles.textTitle, { color: this.state.gasFastSelected ? colors.white : undefined }]}>
						{strings('transaction.gas_fee_fast')}
					</Text>
					<Text style={[styles.text, { color: this.state.gasFastSelected ? colors.white : undefined }]}>
						{getRenderableEthGasFee(fastGwei, gas)} {ticker}
					</Text>
					<Text style={[styles.text, { color: this.state.gasFastSelected ? colors.white : undefined }]}>
						{getRenderableFiatGasFee(fastGwei, conversionRate, currentCurrency, gas)}
					</Text>
				</TouchableOpacity>
			</View>
		);
	};

	renderCustomGasInput = () => {
		const { customGasLimit, customGasPrice, warningGasLimit, warningGasPrice } = this.state;
		const { totalGas } = this.props;
		const ticker = getTicker(this.props.ticker);
		return (
			<View>
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
					value={customGasPrice.toString()}
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
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker
});

export default connect(mapStateToProps)(CustomGas);
