import React, { Component } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import Identicon from '../Identicon';
import LinearGradient from 'react-native-linear-gradient';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import CollectibleImage from '../CollectibleImage';
import { renderShortAddress } from '../../util/address';
import AssetActionButtons from '../AssetActionButtons';

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
		marginTop: 10,
		marginBottom: 10
	},
	name: {
		fontSize: 30,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.normal
	},
	symbol: {
		fontSize: 18,
		color: colors.fontSecondary,
		textAlign: 'center',
		...fontStyles.light
	},
	content: {
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.light
	},
	label: {
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.bold
	}
});

/**
 * View that displays a specific collectible contract
 * including the overview (name, address, symbol, logo, description, total supply)
 */
export default class CollectibleContractOverview extends Component {
	static propTypes = {
		/**
		 * Object that represents the asset to be displayed
		 */
		collectibleContract: PropTypes.object,
		/**
		 * Navigation object required to push
		 * the Asset detail view
		 */
		navigation: PropTypes.object
	};

	onAdd = () => {
		this.props.navigation.push('AddAsset', { assetType: 'collectible' });
	};

	onSend = () => {
		Alert.alert(strings('drawer.coming_soon'));
	};

	renderLogo = () => {
		const {
			collectibleContract: { logo, address }
		} = this.props;
		return logo ? <CollectibleImage collectible={{ address, image: logo }} /> : <Identicon address={address} />;
	};

	render = () => {
		const {
			collectibleContract: { name, symbol, address, description, total_supply }
		} = this.props;
		return (
			<LinearGradient colors={[colors.slate, colors.white]} style={styles.wrapper}>
				<View style={styles.assetLogo}>{this.renderLogo()}</View>
				<View style={styles.balance}>
					<Text style={styles.name}>{name}</Text>
					<Text style={styles.symbol}>{symbol}</Text>
					<Text style={styles.label}>{strings('asset_overview.description')}</Text>
					<Text style={styles.content}>{description}</Text>
					<Text style={styles.label}>Total Supply:</Text>
					<Text style={styles.content}>{total_supply}</Text>
					<Text style={styles.label}>Address: </Text>
					<Text style={styles.content}>{renderShortAddress(address)}</Text>
				</View>

				<AssetActionButtons
					leftText={strings('asset_overview.send_button').toUpperCase()}
					rightText={strings('asset_overview.add_collectible_button').toUpperCase()}
					onRightPress={this.onAdd}
					onLeftPress={this.onSend}
				/>
			</LinearGradient>
		);
	};
}
