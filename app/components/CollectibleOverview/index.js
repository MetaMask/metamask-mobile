import React, { Component } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import StyledButton from '../StyledButton';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import CollectibleImage from '../CollectibleImage';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1
	},
	basicsWrapper: {
		flex: 1,
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center'
	},
	assetLogo: {
		marginTop: 15,
		paddingVertical: 15,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.white,
		borderRadius: 20,
		width: 300
	},
	buttons: {
		flex: 1,
		flexDirection: 'row',
		marginTop: 30,
		width: '50%',
		alignItems: 'center',
		justifyContent: 'center'
	},
	button: {
		flex: 1,
		flexDirection: 'row'
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
	},
	label: {
		marginTop: 0,
		borderColor: colors.borderColor,
		...fontStyles.bold
	},
	informationWrapper: {
		flex: 1,
		paddingHorizontal: 30
	},
	content: {
		fontSize: 16,
		color: colors.fontPrimary,
		paddingTop: 10,
		...fontStyles.normal
	},
	row: {
		marginVertical: 10
	}
});

/**
 * View that displays the information of a specific ERC-721 Token
 */
export default class CollectibleOverview extends Component {
	static propTypes = {
		/**
		 * Object that represents the collectible to be displayed
		 */
		collectible: PropTypes.object
	};

	onSend = async () => {
		Alert.alert(strings('drawer.coming_soon'));
	};

	renderImage = () => {
		const { collectible } = this.props;
		return <CollectibleImage renderFull collectible={collectible} />;
	};

	render = () => {
		const {
			collectible: { tokenId, description }
		} = this.props;
		return (
			<View style={styles.wrapper}>
				<View style={styles.basicsWrapper}>
					<View style={styles.assetLogo}>{this.renderImage()}</View>
					<View style={styles.buttons}>
						<StyledButton
							type={'confirm'}
							onPress={this.onSend}
							containerStyle={styles.button}
							style={styles.buttonContent}
							childGroupStyle={styles.flexRow}
						>
							<MaterialIcon name={'send'} size={15} color={colors.white} style={styles.buttonIcon} />
							<Text style={styles.buttonText}>{strings('asset_overview.send_button').toUpperCase()}</Text>
						</StyledButton>
					</View>
				</View>

				<View style={styles.informationWrapper}>
					<View style={styles.row}>
						<Text style={styles.label}>{strings('collectible.collectible_token_id')}</Text>
						<Text style={styles.content}>{tokenId}</Text>
					</View>
					{description && (
						<View style={styles.row}>
							<Text style={styles.label}>{strings('collectible.collectible_description')}</Text>
							<Text style={styles.content}>{description}</Text>
						</View>
					)}
				</View>
			</View>
		);
	};
}
