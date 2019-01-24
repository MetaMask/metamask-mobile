import React, { Component } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import Identicon from '../Identicon';
import LinearGradient from 'react-native-linear-gradient';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import CollectibleImage from '../CollectibleImage';
import { renderShortAddress } from '../../util/address';

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
	balance: {
		flex: 1,
		alignItems: 'center',
		marginTop: 10,
		marginBottom: 10
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

/**
 * View that displays a specific collectible contract
 * including the overview (name, address, symbol, logo, description, total supply)
 */
export default class CollectibleContractOverview extends Component {
	static propTypes = {
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object,
		/**
		 * Object that represents the asset to be displayed
		 */
		collectibleContract: PropTypes.object
	};

	onDeposit = () => {
		Alert.alert(strings('drawer.coming_soon'));
	};

	onSend = async () => {
		const { asset } = this.props;
		if (asset.symbol === 'ETH') {
			this.props.navigation.navigate('SendView');
		} else {
			this.props.navigation.navigate('SendView', asset);
		}
	};

	renderLogo = () => {
		const {
			collectibleContract: { logo, address }
		} = this.props;
		return logo ? <CollectibleImage collectible={{ address, image: logo }} /> : <Identicon address={address} />;
	};

	render = () => {
		const {
			collectibleContract: { name, symbol, address }
		} = this.props;
		return (
			<LinearGradient colors={[colors.slate, colors.white]} style={styles.wrapper}>
				<View style={styles.assetLogo}>{this.renderLogo()}</View>
				<View style={styles.balance}>
					<Text style={styles.amount}>{name}</Text>
					<Text style={styles.amountFiat}>{symbol}</Text>
					<Text style={styles.amountFiat}>{renderShortAddress(address)}</Text>
				</View>
			</LinearGradient>
		);
	};
}
