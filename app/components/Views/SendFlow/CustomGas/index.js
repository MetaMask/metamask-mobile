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
	getBasicGasEstimates
} from '../../../../util/custom-gas';
import { BN } from 'ethereumjs-util';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import StyledButton from '../../../UI/StyledButton';
import { fromWei, renderWei, hexToBN, renderFromWei, isBN, isDecimal } from '../../../../util/number';
import { getTicker } from '../../../../util/transactions';
import Radio from '../../../UI/Radio';
import Device from '../../../../util/Device';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		minHeight: '50%',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingTop: 24,
		paddingHorizontal: 24,
		paddingBottom: Device.isIphoneX() ? 44 : 0
	},
	customGasHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
		paddingBottom: 20
	},
	selectors: {
		backgroundColor: colors.white,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingBottom: 10
	},
	selector: {
		flex: 1,
		padding: 12,
		borderWidth: 1,
		borderColor: colors.grey100
	},
	selectorLeft: {
		borderTopLeftRadius: 10,
		borderBottomLeftRadius: 10
	},
	selectorRight: {
		borderTopRightRadius: 10,
		borderBottomRightRadius: 10
	},
	text: {
		...fontStyles.light,
		color: colors.black,
		fontSize: 10,
		textTransform: 'uppercase'
	},
	textTime: {
		...fontStyles.bold,
		color: colors.black,
		marginBottom: 4,
		fontSize: 18,
		textTransform: 'none'
	},
	textTitle: {
		...fontStyles.bold,
		color: colors.black,
		letterSpacing: 1,
		fontSize: 10,
		textTransform: 'uppercase'
	},
	customGasModalTitleText: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		alignSelf: 'center'
	},
	textTotalGas: {
		...fontStyles.bold,
		color: colors.black,
		marginBottom: 8,
		marginTop: 4
	},
	textOptions: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.black
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
		marginVertical: 4,
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
		borderColor: colors.blue,
		zIndex: 1
	},
	selectorNotSelected: {
		backgroundColor: colors.white
	},
	advancedOptionsContainer: {
		marginTop: 16
	},
	optionsContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingBottom: 20
	},
	basicButton: {
		width: 116,
		height: 36,
		padding: 8,
		justifyContent: 'center',
		alignItems: 'center'
	},
	optionSelected: {
		backgroundColor: colors.grey000,
		borderWidth: 1,
		borderRadius: 20,
		borderColor: colors.grey100
	},
	selectorTitle: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		height: 16
	},
	message: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 12
	},
	gasSelectorContainer: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start'
	},
	footerContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-end'
	},
	buttonNext: {
		flex: 1
	},
	radio: {}
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
		selected: PropTypes.string,
		/**
		 * Shows or hides the custom gas modal
		 */
		toggleCustomGasModal: PropTypes.func,
		/**
		 * Sets the gas fee
		 */
		handleSetGasFee: PropTypes.func
	};

	state = {
		basicGasEstimates: {},
		gasFastSelected: this.props.selected === 'fast',
		gasAverageSelected: this.props.selected === 'average',
		gasSlowSelected: this.props.selected === 'slow',
		averageGwei: 0,
		averageWait: undefined,
		fastGwei: 0,
		fastWait: undefined,
		safeLowGwei: 0,
		safeLowWait: undefined,
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
		this.props.handleGasFeeSelection({
			gas,
			gasPrice: apiEstimateModifiedToWEI(fastGwei),
			customGasSelected: 'fast'
		});
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
		this.props.handleGasFeeSelection({
			gas,
			gasPrice: apiEstimateModifiedToWEI(averageGwei),
			customGasSelected: 'average'
		});
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
		this.props.handleGasFeeSelection({
			gas,
			gasPrice: apiEstimateModifiedToWEI(safeLowGwei),
			customGasSelected: 'slow'
		});
	};

	onAdvancedOptions = () => {
		const { advancedCustomGas, selected, fastGwei, averageGwei, safeLowGwei, customGasPrice } = this.state;
		const { gas } = this.props;
		if (advancedCustomGas) {
			switch (selected) {
				case 'slow':
					this.props.handleGasFeeSelection({
						gas,
						gasPrice: apiEstimateModifiedToWEI(safeLowGwei),
						customGasSelected: 'slow'
					});
					break;
				case 'average':
					this.props.handleGasFeeSelection({
						gas,
						gasPrice: apiEstimateModifiedToWEI(averageGwei),
						customGasSelected: 'average'
					});
					break;
				case 'fast':
					this.props.handleGasFeeSelection({
						gas,
						gasPrice: apiEstimateModifiedToWEI(fastGwei),
						customGasSelected: 'fast'
					});
					break;
			}
		} else {
			this.setState({ customGasLimit: fromWei(gas, 'wei') });
			this.props.handleGasFeeSelection({ gas, gasPrice: apiEstimateModifiedToWEI(customGasPrice) });
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
		let warningGasLimit;
		const { customGasPrice } = this.state;
		const bnValue = new BN(value);
		if (!value || value === '' || !isDecimal(value)) warningGasLimit = strings('transaction.invalid_gas');
		else if (bnValue && !isBN(bnValue)) warningGasLimit = strings('transaction.invalid_gas');
		else if (bnValue.lt(new BN(21000)) || bnValue.gt(new BN(7920028)))
			warningGasLimit = strings('custom_gas.warning_gas_limit');
		this.setState({ customGasLimit: value, customGasLimitBN: bnValue, warningGasLimit });
		this.props.handleGasFeeSelection({
			gas: bnValue,
			gasPrice: apiEstimateModifiedToWEI(customGasPrice),
			error: warningGasLimit
		});
	};

	onGasPriceChange = value => {
		let warningGasPrice;
		const { customGasLimit } = this.state;
		if (!value || value === '' || !isDecimal(value)) {
			warningGasPrice = strings('transaction.invalid_gas_price');
			this.setState({ customGasPrice: value, warningGasPrice });
			this.props.handleGasFeeSelection({ error: warningGasPrice });
		} else {
			const gasPriceBN = apiEstimateModifiedToWEI(value);
			if (gasPriceBN && !isBN(gasPriceBN)) warningGasPrice = strings('transaction.invalid_gas_price');
			this.setState({
				customGasPrice: value,
				customGasPriceBN: apiEstimateModifiedToWEI(value),
				warningGasPrice
			});
			this.props.handleGasFeeSelection({ gas: new BN(customGasLimit, 10), gasPrice: gasPriceBN });
		}
	};

	renderGasSelector = (name, wei, selected, wait, onPress) => {
		const { conversionRate, currentCurrency, gas } = this.props;
		const ticker = getTicker(this.props.ticker);
		return (
			<TouchableOpacity
				key={name}
				onPress={onPress}
				style={[
					styles.selector,
					selected ? styles.selectorSelected : styles.selectorNotSelected,
					name === 'slow' && styles.selectorLeft,
					name === 'fast' && styles.selectorRight
				]}
			>
				<View style={styles.gasSelectorContainer}>
					<View>
						<View style={styles.selectorTitle}>
							<Text style={styles.textTitle}>{strings(`transaction.gas_fee_${name}`)}</Text>
						</View>
						<Text style={[styles.text, styles.textTime]}>{wait}</Text>
						<Text style={styles.text}>
							{getRenderableEthGasFee(wei, gas)} {ticker}
						</Text>
						<Text style={styles.text}>
							{getRenderableFiatGasFee(wei, conversionRate, currentCurrency, gas)}
						</Text>
					</View>
					<View style={styles.radio}>
						<Radio selected={selected} />
					</View>
				</View>
			</TouchableOpacity>
		);
	};

	renderCustomGasSelector = () => {
		const {
			averageGwei,
			safeLowGwei,
			fastGwei,
			gasSlowSelected,
			gasAverageSelected,
			gasFastSelected,
			averageWait,
			safeLowWait,
			fastWait
		} = this.state;
		return (
			<View style={styles.selectors}>
				{this.renderGasSelector('slow', safeLowGwei, gasSlowSelected, safeLowWait, this.onPressGasSlow)}
				{this.renderGasSelector(
					'average',
					averageGwei,
					gasAverageSelected,
					averageWait,
					this.onPressGasAverage
				)}
				{this.renderGasSelector('fast', fastGwei, gasFastSelected, fastWait, this.onPressGasFast)}
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
					{renderFromWei(totalGas)} {ticker}
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
				<Text style={styles.warningText}>{warningGasPrice}</Text>
			</View>
		);
	};

	render = () => {
		if (this.state.ready) {
			const { advancedCustomGas } = this.state;
			const { toggleCustomGasModal, handleSetGasFee } = this.props;
			return (
				<View style={styles.root}>
					<View style={styles.customGasHeader}>
						<TouchableOpacity onPress={toggleCustomGasModal}>
							<IonicIcon name={'ios-arrow-back'} size={24} color={colors.black} />
						</TouchableOpacity>
						<Text style={styles.customGasModalTitleText}>{strings('transaction.edit_network_fee')}</Text>
						<IonicIcon name={'ios-arrow-back'} size={24} color={colors.white} />
					</View>
					<View style={styles.optionsContainer}>
						<TouchableOpacity
							style={[styles.basicButton, advancedCustomGas ? null : styles.optionSelected]}
							onPress={this.onAdvancedOptions}
						>
							<Text style={styles.textOptions}>{strings('custom_gas.basic_options')}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.basicButton, advancedCustomGas ? styles.optionSelected : null]}
							onPress={this.onAdvancedOptions}
						>
							<Text style={styles.textOptions}>{strings('custom_gas.advanced_options')}</Text>
						</TouchableOpacity>
					</View>
					{advancedCustomGas ? this.renderCustomGasInput() : this.renderCustomGasSelector()}
					<Text style={styles.message}>{strings('custom_gas.cost_explanation')}</Text>
					<View style={styles.footerContainer}>
						<StyledButton
							type={'confirm'}
							containerStyle={styles.buttonNext}
							onPress={handleSetGasFee}
							testID={'custom-gas-save-button'}
						>
							{strings('custom_gas.save')}
						</StyledButton>
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
