import React, { Component } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import LinearGradient from 'react-native-linear-gradient';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import CollectibleImage from '../CollectibleImage';
import AssetActionButtons from '../AssetActionButtons';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		padding: 20,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.borderColor
	},
	assetLogo: {
		alignContent: 'center',
		alignItems: 'center',
		marginTop: 15,
		marginBottom: 10
	},
	information: {
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
		navigation: PropTypes.object,
		/**
		 * How many collectibles are owned by the user
		 */
		ownerOf: PropTypes.number
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
		return <CollectibleImage collectible={{ address, image: logo }} />;
	};

	render = () => {
		const {
			collectibleContract: { name, symbol },
			ownerOf
		} = this.props;
		return (
			<LinearGradient colors={[colors.slate, colors.white]} style={styles.wrapper}>
				<View style={styles.assetLogo}>{this.renderLogo()}</View>
				<View style={styles.information}>
					<Text style={styles.name}>{ownerOf}</Text>
					<Text style={styles.name}>{name}</Text>
					<Text style={styles.symbol}>{symbol}</Text>
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
