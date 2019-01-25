import React, { Component } from 'react';
import { Alert, StyleSheet, Text, View, TouchableOpacity, InteractionManager, Image } from 'react-native';
import PropTypes from 'prop-types';
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
	},
	opensea: {
		fontSize: 12,
		textAlignVertical: 'center',
		paddingRight: 5,
		color: colors.fontSecondary,
		...fontStyles.light
	},
	credits: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		textAlign: 'center'
	},
	openSeaLogo: {
		width: 100,
		height: 30,
		resizeMode: 'contain'
	},
	creditsView: {
		alignItems: 'center',
		marginVertical: 5
	},
	creditsElements: {
		flexDirection: 'row'
	}
});

const openSeaLogo = require('../../images/opensea-logo-flat-colored-blue.png'); // eslint-disable-line

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
		return <CollectibleImage collectible={{ address, image: logo }} />;
	};

	goToOpenSea = () => {
		const openSeaUrl = 'https://opensea.io/';
		InteractionManager.runAfterInteractions(() => {
			this.props.navigation.push('BrowserView', {
				url: openSeaUrl
			});
		});
	};

	render = () => {
		const {
			collectibleContract: { name, symbol, address, description, totalSupply }
		} = this.props;
		return (
			<LinearGradient colors={[colors.slate, colors.white]} style={styles.wrapper}>
				<View style={styles.assetLogo}>{this.renderLogo()}</View>
				<View style={styles.information}>
					<Text style={styles.name}>{name}</Text>
					<Text style={styles.symbol}>{symbol}</Text>
					<View style={styles.creditsView}>
						<TouchableOpacity style={styles.credits} onPress={this.goToOpenSea}>
							<View style={styles.creditsElements}>
								<Text style={styles.opensea}>{strings('collectible.powered_by_opensea')}</Text>
								<Image source={openSeaLogo} style={styles.openSeaLogo} />
							</View>
						</TouchableOpacity>
					</View>
					<Text style={styles.label}>{strings('asset_overview.description')}</Text>
					<Text style={styles.content}>{description}</Text>
					<Text style={styles.label}>{strings('asset_overview.totalSupply')}</Text>
					<Text style={styles.content}>{totalSupply}</Text>
					<Text style={styles.label}>{strings('asset_overview.address')}</Text>
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
