import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	Text,
	View,
	SafeAreaView,
	InteractionManager,
	Image
} from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/Device';
import { connect } from 'react-redux';
import { isMainNet } from '../../../util/networks';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderRadius: 10,
		minHeight: 450
	},
	titleWrapper: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100
	},
	title: {
		textAlign: 'center',
		fontSize: 18,
		marginVertical: 12,
		marginHorizontal: 20,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	label: {
		marginTop: 0,
		borderColor: colors.grey100,
		...fontStyles.bold
	},
	informationWrapper: {
		flex: 1,
		paddingHorizontal: 20
	},
	content: {
		fontSize: 16,
		color: colors.grey400,
		paddingTop: 10,
		...fontStyles.normal
	},
	address: {
		fontSize: 12
	},
	row: {
		marginVertical: 10
	},
	footer: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
		height: 60,
		justifyContent: 'center',
		flexDirection: 'row',
		alignItems: 'center'
	},
	footerButton: {
		flex: 1,
		alignContent: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		height: 60
	},
	closeButton: {
		fontSize: 16,
		color: colors.blue,
		...fontStyles.normal
	},
	opensea: {
		fontSize: 8,
		textAlignVertical: 'center',
		paddingRight: 5,
		marginTop: Device.isAndroid() ? -2 : 4,
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
		width: 80,
		height: 20,
		resizeMode: 'contain'
	},
	creditsView: {
		alignItems: 'center',
		marginTop: 15
	},
	creditsElements: {
		flexDirection: 'row'
	}
});

const openSeaLogo = require('../../../images/opensea-logo-flat-colored-blue.png'); // eslint-disable-line

/**
 * View that contains a collectible contract information as description, total supply and address
 */
class CollectibleContractInformation extends PureComponent {
	static propTypes = {
		/**
		 * Navigation object required to push
		 * the Asset detail view
		 */
		navigation: PropTypes.object,
		/**
		 * An function to handle the close event
		 */
		onClose: PropTypes.func,
		/**
		 * Collectible contract object
		 */
		collectibleContract: PropTypes.object,
		/**
		 * Object representing the selected network
		 */
		network: PropTypes.object.isRequired
	};

	closeModal = () => {
		this.props.onClose(true);
	};

	goToOpenSea = () => {
		const openSeaUrl = 'https://opensea.io/';
		InteractionManager.runAfterInteractions(() => {
			this.closeModal();
			this.props.navigation.push('Webview', {
				url: openSeaUrl,
				title: 'OpenSea'
			});
		});
	};

	render = () => {
		const {
			collectibleContract: { name, description, totalSupply, address },
			network
		} = this.props;
		const is_main_net = isMainNet(network);

		return (
			<SafeAreaView style={styles.wrapper}>
				<View style={styles.titleWrapper}>
					<Text style={styles.title} onPress={this.closeModal}>
						{name}
					</Text>
				</View>
				<ScrollView style={styles.informationWrapper}>
					{description && (
						<View style={styles.row}>
							<Text style={styles.label}>{strings('asset_overview.description')}</Text>
							<Text style={styles.content}>{description}</Text>
						</View>
					)}
					{totalSupply && (
						<View style={styles.row}>
							<Text style={styles.label}>{strings('asset_overview.totalSupply')}</Text>
							<Text style={styles.content}>{totalSupply}</Text>
						</View>
					)}
					<View style={styles.row}>
						<Text style={styles.label}>{strings('asset_overview.address')}</Text>
						<Text style={[styles.content, styles.address]}>{address}</Text>
					</View>
					{is_main_net && (
						<View style={styles.creditsView}>
							<TouchableOpacity style={styles.credits} onPress={this.goToOpenSea}>
								<View style={styles.creditsElements}>
									<Text style={styles.opensea}>{strings('collectible.powered_by_opensea')}</Text>
									<Image source={openSeaLogo} style={styles.openSeaLogo} />
								</View>
							</TouchableOpacity>
						</View>
					)}
				</ScrollView>

				<View style={styles.footer}>
					<TouchableOpacity style={styles.footerButton} onPress={this.closeModal}>
						<Text style={styles.closeButton}>{strings('networks.close')}</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	network: state.engine.backgroundState.NetworkController
});

export default connect(mapStateToProps)(CollectibleContractInformation);
