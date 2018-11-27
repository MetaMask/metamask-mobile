import React, { Component } from 'react';
import { Image, Alert, Platform, StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import AssetIcon from '../AssetIcon';
import Identicon from '../Identicon';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FoundationIcon from 'react-native-vector-icons/Foundation';
import StyledButton from '../StyledButton';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		padding: 20,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.borderColor
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
		flex: 1,
		alignItems: 'center',
		marginTop: 10,
		marginBottom: 10
	},
	buttons: {
		flex: 1,
		flexDirection: 'row',
		marginTop: 30
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
	},
	button: {
		flex: 1,
		flexDirection: 'row'
	},
	leftButton: {
		marginRight: 10
	},
	rightButton: {
		marginLeft: 10
	},
	buttonText: {
		marginLeft: 8,
		marginTop: Platform.OS === 'ios' ? 0 : -2,
		fontSize: 15,
		color: colors.white,
		...fontStyles.bold
	},
	buttonContent: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'center'
	},
	buttonIcon: {
		width: 15,
		height: 15,
		marginTop: 0
	},
	flexRow: {
		flexDirection: 'row'
	}
});

const ethLogo = require('../../images/eth-logo.png'); // eslint-disable-line

/**
 * View that displays the information of a specific asset (Token or ETH)
 * including the overview (Amount, Balance, Symbol, Logo)
 */
export default class AssetOverview extends Component {
	static propTypes = {
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object,
		/**
		 * Object that represents the asset to be displayed
		 */
		asset: PropTypes.object
	};

	onDeposit = () => {
		Alert.alert(strings('drawer.coming_soon'));
	};

	onSend = async () => {
		this.props.navigation.navigate('SendScreen');
	};

	renderLogo = () => {
		const {
			asset: { address, logo, symbol }
		} = this.props;
		if (symbol === 'ETH') {
			return <Image source={ethLogo} style={styles.ethLogo} />;
		}
		return logo ? <AssetIcon logo={logo} /> : <Identicon address={address} />;
	};

	render = () => {
		const {
			asset: { symbol, balance, balanceFiat }
		} = this.props;
		return (
			<LinearGradient colors={[colors.slate, colors.white]} style={styles.wrapper}>
				<View style={styles.assetLogo}>{this.renderLogo()}</View>
				<View style={styles.balance}>
					<Text style={styles.amount}>
						{' '}
						{balance} {symbol}
					</Text>
					<Text style={styles.amountFiat}>{balanceFiat}</Text>
				</View>
				<View style={styles.buttons}>
					<StyledButton
						type={'confirm'}
						onPress={this.onSend}
						containerStyle={[styles.button, styles.leftButton]}
						style={styles.buttonContent}
						childGroupStyle={styles.flexRow}
					>
						<MaterialIcon name={'send'} size={15} color={colors.white} style={styles.buttonIcon} />
						<Text style={styles.buttonText}>{strings('asset_overview.send_button').toUpperCase()}</Text>
					</StyledButton>
					<StyledButton
						type={'confirm'}
						onPress={this.onDeposit}
						containerStyle={[styles.button, styles.rightButton]}
						style={styles.buttonContent}
						childGroupStyle={styles.flexRow}
					>
						<FoundationIcon name={'download'} size={20} color={colors.white} style={styles.buttonIcon} />
						<Text style={styles.buttonText}>{strings('asset_overview.receive_button').toUpperCase()}</Text>
					</StyledButton>
				</View>
			</LinearGradient>
		);
	};
}
