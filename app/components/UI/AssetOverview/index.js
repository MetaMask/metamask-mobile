import React, { PureComponent } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import AssetIcon from '../AssetIcon';
import Identicon from '../Identicon';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import AssetActionButtons from '../AssetActionButtons';
import { toggleReceiveModal } from '../../../actions/modals';
import { connect } from 'react-redux';
import { renderFromTokenMinimalUnit, balanceToFiat, renderFromWei, weiToFiat, hexToBN } from '../../../util/number';
import { safeToChecksumAddress } from '../../../util/address';
import { getEther } from '../../../util/transactions';
import { newAssetTransaction } from '../../../actions/transaction';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		padding: 20,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.grey100,
		alignContent: 'center',
		alignItems: 'center',
		paddingBottom: 30
	},
	assetLogo: {
		marginTop: 15,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10,
		marginBottom: 10
	},
	ethLogo: {
		width: 70,
		height: 70
	},
	balance: {
		alignItems: 'center',
		marginTop: 10,
		marginBottom: 20
	},
	amount: {
		fontSize: 30,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	amountFiat: {
		fontSize: 18,
		color: colors.fontSecondary,
		...fontStyles.light
	}
});

const ethLogo = require('../../../images/eth-logo.png'); // eslint-disable-line

/**
 * View that displays the information of a specific asset (Token or ETH)
 * including the overview (Amount, Balance, Symbol, Logo)
 */
class AssetOverview extends PureComponent {
	static propTypes = {
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object,
		/**
		 * Object that represents the asset to be displayed
		 */
		asset: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Start transaction with asset
		 */
		newAssetTransaction: PropTypes.func,
		/**
		 * An object containing token balances for current account and network in the format address => balance
		 */
		tokenBalances: PropTypes.object,
		/**
		 * An object containing token exchange rates in the format address => exchangeRate
		 */
		tokenExchangeRates: PropTypes.object,
		/**
		 * Action that toggles the receive modal
		 */
		toggleReceiveModal: PropTypes.func,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string
	};

	onReceive = () => {
		const { asset } = this.props;
		this.props.toggleReceiveModal(asset);
	};

	onSend = async () => {
		const { asset } = this.props;
		if (asset.isETH) {
			this.props.newAssetTransaction(getEther());
			this.props.navigation.navigate('SendFlowView');
		} else {
			this.props.newAssetTransaction(asset);
			this.props.navigation.navigate('SendFlowView');
		}
	};

	renderLogo = () => {
		const {
			asset: { address, image, logo, isETH }
		} = this.props;
		if (isETH) {
			return <Image source={ethLogo} style={styles.ethLogo} />;
		}
		const watchedAsset = image !== undefined;
		return logo || image ? (
			<AssetIcon watchedAsset={watchedAsset} logo={image || logo} />
		) : (
			<Identicon address={address} />
		);
	};

	render() {
		const {
			accounts,
			asset,
			primaryCurrency,
			selectedAddress,
			tokenExchangeRates,
			tokenBalances,
			conversionRate,
			currentCurrency
		} = this.props;
		let mainBalance, secondaryBalance;
		const itemAddress = safeToChecksumAddress(asset.address);
		let balance, balanceFiat;
		if (asset.isETH) {
			balance = renderFromWei(accounts[selectedAddress] && accounts[selectedAddress].balance);
			balanceFiat = weiToFiat(hexToBN(accounts[selectedAddress].balance), conversionRate, currentCurrency);
		} else {
			const exchangeRate = itemAddress in tokenExchangeRates ? tokenExchangeRates[itemAddress] : undefined;
			balance =
				itemAddress in tokenBalances
					? renderFromTokenMinimalUnit(tokenBalances[itemAddress], asset.decimals)
					: 0;
			balanceFiat = balanceToFiat(balance, conversionRate, exchangeRate, currentCurrency);
		}
		// choose balances depending on 'primaryCurrency'
		if (primaryCurrency === 'ETH') {
			mainBalance = `${balance} ${asset.symbol}`;
			secondaryBalance = balanceFiat;
		} else {
			mainBalance = !balanceFiat ? `${balance} ${asset.symbol}` : balanceFiat;
			secondaryBalance = !balanceFiat ? balanceFiat : `${balance} ${asset.symbol}`;
		}

		return (
			<View style={styles.wrapper} testID={'token-asset-overview'}>
				<View style={styles.assetLogo}>{this.renderLogo()}</View>
				<View style={styles.balance}>
					<Text style={styles.amount} testID={'token-amount'}>
						{mainBalance}
					</Text>
					<Text style={styles.amountFiat}>{secondaryBalance}</Text>
				</View>

				<AssetActionButtons
					leftText={strings('asset_overview.send_button').toUpperCase()}
					testID={'token-send-button'}
					middleText={strings('asset_overview.receive_button').toUpperCase()}
					onLeftPress={this.onSend}
					onMiddlePress={this.onReceive}
					middleType={'receive'}
				/>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	primaryCurrency: state.settings.primaryCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	tokenBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	tokenExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates
});

const mapDispatchToProps = dispatch => ({
	toggleReceiveModal: asset => dispatch(toggleReceiveModal(asset)),
	newAssetTransaction: selectedAsset => dispatch(newAssetTransaction(selectedAsset))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(AssetOverview);
