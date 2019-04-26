import React, { Component } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import AssetIcon from '../AssetIcon';
import Identicon from '../Identicon';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import AssetActionButtons from '../AssetActionButtons';
import { setTokensTransaction } from '../../../actions/transaction';
import { toggleReceiveModal } from '../../../actions/modals';
import { connect } from 'react-redux';

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
class AssetOverview extends Component {
	static propTypes = {
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
		 * Action that sets a tokens type transaction
		 */
		setTokensTransaction: PropTypes.func.isRequired,
		/**
		 * Action that toggles the receive modal
		 */
		toggleReceiveModal: PropTypes.func,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string
	};

	onDeposit = () => {
		this.props.toggleReceiveModal();
	};

	onSend = async () => {
		const { asset } = this.props;
		if (asset.symbol === 'ETH') {
			this.props.setTokensTransaction({ symbol: 'ETH' });
			this.props.navigation.navigate('SendView');
		} else {
			this.props.setTokensTransaction(asset);
			this.props.navigation.navigate('SendView');
		}
	};

	renderLogo = () => {
		const {
			asset: { address, image, logo, symbol }
		} = this.props;
		if (symbol === 'ETH') {
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
			asset: { symbol, balance, balanceFiat },
			primaryCurrency
		} = this.props;
		let mainBalance, secondaryBalance;

		// choose balances depending on 'primaryCurrency'
		if (primaryCurrency === 'ETH') {
			mainBalance = balance + ' ' + symbol;
			secondaryBalance = balanceFiat;
		} else {
			mainBalance = !balanceFiat ? balance + ' ' + symbol : balanceFiat;
			secondaryBalance = !balanceFiat ? balanceFiat : balance + ' ' + symbol;
		}

		return (
			<View style={styles.wrapper}>
				<View style={styles.assetLogo}>{this.renderLogo()}</View>
				<View style={styles.balance}>
					<Text style={styles.amount}>{mainBalance}</Text>
					<Text style={styles.amountFiat}>{secondaryBalance}</Text>
				</View>

				<AssetActionButtons
					leftText={strings('asset_overview.send_button').toUpperCase()}
					middleText={strings('asset_overview.receive_button').toUpperCase()}
					onLeftPress={this.onSend}
					onMiddlePress={this.onDeposit}
				/>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	primaryCurrency: state.settings.primaryCurrency
});

const mapDispatchToProps = dispatch => ({
	setTokensTransaction: asset => dispatch(setTokensTransaction(asset)),
	toggleReceiveModal: () => dispatch(toggleReceiveModal())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(AssetOverview);
