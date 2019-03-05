import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicon from 'react-native-vector-icons/Ionicons';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import CollectibleImage from '../CollectibleImage';
import { setCollectibleContractTransaction } from '../../../actions/transaction';
import { connect } from 'react-redux';
import { toggleCollectibleContractModal } from '../../../actions/modals';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		paddingHorizontal: 20,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.borderColor,
		alignContent: 'center',
		alignItems: 'center',
		paddingBottom: 30
	},
	assetLogo: {
		marginTop: 20
	},
	information: {
		flex: 1,
		flexDirection: 'row',
		marginTop: 10
	},
	name: {
		fontSize: 30,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	buttons: {
		flex: 1,
		flexDirection: 'row',
		marginTop: 20,
		alignContent: 'center',
		alignItems: 'center',
		maxWidth: 200
	},
	button: {
		flex: 1,
		justifyContent: 'center',
		alignContent: 'center',
		alignItems: 'center'
	},
	buttonIconWrapper: {
		width: 36,
		height: 36,
		paddingTop: Platform.OS === 'android' ? 2 : 4,
		paddingLeft: 1,
		justifyContent: 'center',
		alignContent: 'center',
		color: colors.white,
		borderRadius: 18,
		backgroundColor: colors.primary
	},
	buttonIcon: {
		justifyContent: 'center',
		alignContent: 'center',
		textAlign: 'center',
		color: colors.white
	},
	buttonText: {
		marginTop: 12,
		textAlign: 'center',
		color: colors.primary,
		fontSize: 11,
		...fontStyles.normal
	},
	sendIcon: {
		paddingTop: 0,
		paddingLeft: 0
	}
});

/**
 * View that displays a specific collectible contract
 * including the overview (name, address, symbol, logo, description, total supply)
 */
class CollectibleContractOverview extends Component {
	static propTypes = {
		/**
		 * Object that represents the asset to be displayed
		 */
		collectibleContract: PropTypes.object,
		/**
		 * Array of ERC721 assets
		 */
		collectibles: PropTypes.array,
		/**
		 * Navigation object required to push
		 * the Asset detail view
		 */
		navigation: PropTypes.object,
		/**
		 * How many collectibles are owned by the user
		 */
		ownerOf: PropTypes.number,
		/**
		 * Action that sets a collectible contract type transaction
		 */
		setCollectibleContractTransaction: PropTypes.func.isRequired,
		/**
		 * Action that toggles the collectible information modal
		 */
		toggleCollectibleContractModal: PropTypes.func.isRequired
	};

	onAdd = () => {
		this.props.navigation.push('AddAsset', { assetType: 'collectible' });
	};

	onSend = () => {
		const { collectibleContract, collectibles } = this.props;
		const collectible = collectibles.find(
			collectible => collectible.address.toLowerCase() === collectibleContract.address.toLowerCase()
		);
		this.props.setCollectibleContractTransaction(collectible);
		this.props.navigation.navigate('SendView');
	};

	onInfo = () => {
		this.props.toggleCollectibleContractModal();
	};

	renderLogo = () => {
		const {
			collectibleContract: { logo, address }
		} = this.props;
		return <CollectibleImage collectible={{ address, image: logo }} />;
	};

	render() {
		const {
			collectibleContract: { name },
			ownerOf
		} = this.props;
		return (
			<View style={styles.wrapper}>
				<View style={styles.assetLogo}>{this.renderLogo()}</View>
				<View style={styles.information}>
					<Text style={styles.name}>
						{ownerOf} {name}
					</Text>
				</View>

				<View style={styles.buttons}>
					<TouchableOpacity type={'normal'} onPress={this.onSend} style={styles.button}>
						<View style={styles.buttonIconWrapper}>
							<MaterialCommunityIcon
								name={'arrow-top-right'}
								size={20}
								color={colors.primary}
								style={[styles.buttonIcon, styles.sendIcon]}
							/>
						</View>
						<Text style={styles.buttonText}>{strings('asset_overview.send_button')}</Text>
					</TouchableOpacity>

					<TouchableOpacity type={'normal'} onPress={this.onAdd} style={styles.button}>
						<View style={styles.buttonIconWrapper}>
							<Ionicon name={'ios-add'} size={30} color={colors.white} style={styles.buttonIcon} />
						</View>
						<Text style={styles.buttonText}>{strings('asset_overview.add_collectible_button')}</Text>
					</TouchableOpacity>
					<TouchableOpacity type={'normal'} onPress={this.onInfo} style={styles.button}>
						<View style={styles.buttonIconWrapper}>
							<Ionicon name={'md-information'} size={30} color={colors.white} style={styles.buttonIcon} />
						</View>
						<Text style={styles.buttonText}>{strings('asset_overview.info')}</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	collectibles: state.engine.backgroundState.AssetsController.collectibles
});

const mapDispatchToProps = dispatch => ({
	setCollectibleContractTransaction: collectible => dispatch(setCollectibleContractTransaction(collectible)),
	toggleCollectibleContractModal: () => dispatch(toggleCollectibleContractModal())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(CollectibleContractOverview);
