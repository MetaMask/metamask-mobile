import React, { Component } from 'react';
import { Alert, StyleSheet, Text, View, Platform } from 'react-native';
import PropTypes from 'prop-types';
import Identicon from '../Identicon';
import LinearGradient from 'react-native-linear-gradient';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import CollectibleImage from '../CollectibleImage';
import { renderShortAddress } from '../../util/address';
import StyledButton from '../StyledButton';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FoundationIcon from 'react-native-vector-icons/Foundation';

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
	name: {
		fontSize: 30,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	symbol: {
		fontSize: 18,
		color: colors.fontSecondary,
		...fontStyles.light
	},
	description: {
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.bold
	},
	totalSupply: {
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.bold
	},
	address: {
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.bold
	},
	buttons: {
		flex: 1,
		flexDirection: 'row',
		marginTop: 30
	},
	button: {
		flex: 1,
		height: 50,
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

/**
 * View that displays a specific collectible contract
 * including the overview (name, address, symbol, logo, description, total supply)
 */
export default class CollectibleContractOverview extends Component {
	static propTypes = {
		/**
		 * Object that represents the asset to be displayed
		 */
		collectibleContract: PropTypes.object
	};

	onAdd = () => {
		Alert.alert(strings('drawer.coming_soon'));
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
					<Text style={styles.description}>Description: {description}</Text>
					<Text style={styles.totalSupply}>Total Supply: {total_supply}</Text>
					<Text style={styles.address}>{renderShortAddress(address)}</Text>
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
						onPress={this.onAdd}
						containerStyle={[styles.button, styles.rightButton]}
						style={styles.buttonContent}
						childGroupStyle={styles.flexRow}
					>
						<FoundationIcon name={'download'} size={20} color={colors.white} style={styles.buttonIcon} />
						<Text style={styles.buttonText}>
							{strings('asset_overview.add_collectible_button').toUpperCase()}
						</Text>
					</StyledButton>
				</View>
			</LinearGradient>
		);
	};
}
