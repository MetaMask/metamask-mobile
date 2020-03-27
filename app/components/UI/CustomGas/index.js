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
	getBasicGasEstimates
} from '../../../util/custom-gas';
import { BN } from 'ethereumjs-util';
import { fromWei, renderWei, hexToBN } from '../../../util/number';
import { getTicker } from '../../../util/transactions';
import Radio from '../Radio';

const styles = StyleSheet.create({
	labelText: {
		...fontStyles.bold,
		color: colors.grey400,
		fontSize: 16
	},
	titleContainer: {
		flex: 1,
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	titleMargin: {
		marginBottom: 10,
		alignItems: 'flex-end'
	},
	radio: {
		marginLeft: 'auto'
	},
	selectors: {
		flex: 1,
		position: 'relative',
		flexDirection: 'row',
		justifyContent: 'space-evenly'
	},
	selector: {
		alignSelf: 'stretch',
		textAlign: 'center',
		alignItems: 'flex-start',
		width: '33.333333333%',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: colors.grey100,
		marginLeft: -2
	},
	selectorSelected: {
		backgroundColor: colors.blue000,
		borderColor: colors.blue,
		zIndex: 1
	},
	advancedOptions: {
		textAlign: 'right',
		alignItems: 'flex-end'
	},
	slow: {
		borderBottomStartRadius: 6,
		borderTopStartRadius: 6
	},
	fast: {
		borderBottomEndRadius: 6,
		borderTopEndRadius: 6
	},
	text: {
		...fontStyles.normal,
		fontSize: 10,
		color: colors.black
	},
	textTitle: {
		...fontStyles.bold,
		fontSize: 10,
		color: colors.black
	},
	textTotalGas: {
		...fontStyles.bold
	},
	textTime: {
		...fontStyles.bold,
		color: colors.black,
		marginVertical: 4,
		fontSize: 18,
		textTransform: 'none'
	},
	textAdvancedOptions: {
		color: colors.blue,
		fontSize: 14
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
		ticker: PropTypes.string,
		/**
		 * Displayed when there is a gas station error
		 */
		gasError: PropTypes.string
	};

	state = {
		basicGasEstimates: {},
		gasFastSelected: false,
		gasAverageSelected: true,
		gasSlowSelected: false,
		averageGwei: 0,
		averageWait: undefined,
		fastGwei: 0,
		fastWait: undefined,
		safeLowGwei: 0,
		safeLowWait: undefined,
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
		const basicGasEstimates = await getBasicGasEstimates();
		this.setState({ ...basicGasEstimates, ready: true });
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
		const {
			averageGwei,
			fastGwei,
			safeLowGwei,
			averageWait,
			safeLowWait,
			fastWait,
			gasSlowSelected,
			gasAverageSelected,
			gasFastSelected
		} = this.state;
		const { conversionRate, currentCurrency, gas } = this.props;
		const ticker = getTicker(this.props.ticker);
		return (
			<View style={styles.selectors}>
				<TouchableOpacity
					key={'safeLow'}
					onPress={this.onPressGasSlow}
					style={[styles.selector, styles.slow, gasSlowSelected && styles.selectorSelected]}
				>
					<View style={styles.titleContainer}>
						<Text style={styles.textTitle}>{strings('transaction.gas_fee_slow')}</Text>
						<View style={styles.radio}>
							<Radio selected={gasSlowSelected} />
						</View>
					</View>
					<Text style={styles.textTime}>{safeLowWait}</Text>
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
					style={[styles.selector, gasAverageSelected && styles.selectorSelected]}
				>
					<View style={styles.titleContainer}>
						<Text style={styles.textTitle}>{strings('transaction.gas_fee_average')}</Text>
						<View style={styles.radio}>
							<Radio selected={gasAverageSelected} />
						</View>
					</View>
					<Text style={styles.textTime}>{averageWait}</Text>
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
					style={[styles.selector, styles.fast, gasFastSelected && styles.selectorSelected]}
				>
					<View style={styles.titleContainer}>
						<Text style={styles.textTitle}>{strings('transaction.gas_fee_fast')}</Text>
						<View style={styles.radio}>
							<Radio selected={gasFastSelected} />
						</View>
					</View>
					<Text style={styles.textTime}>{fastWait}</Text>
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
			const { gasError } = this.props;
			return (
				<View style={baseStyles.flexGrow}>
					<View style={[styles.titleContainer, styles.titleMargin]}>
						<View>
							<Text style={styles.labelText}>{strings('transaction.gas_fee')}:</Text>
							{gasError ? <Text style={styles.error}>{gasError}</Text> : null}
						</View>
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
					{advancedCustomGas ? this.renderCustomGasInput() : this.renderCustomGasSelector()}
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
