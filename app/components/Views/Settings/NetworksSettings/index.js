import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { StyleSheet, Text, ScrollView, TouchableOpacity, View } from 'react-native';
import { connect } from 'react-redux';
import ActionSheet from 'react-native-actionsheet';
import { colors, fontStyles } from '../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { strings } from '../../../../../locales/i18n';
import Networks, { getAllNetworks } from '../../../../util/networks';
import StyledButton from '../../../UI/StyledButton';
import Engine from '../../../../core/Engine';
import { MAINNET, RPC } from '../../../../constants/network';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 24,
		marginBottom: 24,
	},
	networkIcon: {
		width: 15,
		height: 15,
		borderRadius: 100,
		marginTop: 2,
		marginRight: 16,
	},
	otherNetworkIcon: {
		width: 15,
		height: 15,
		borderRadius: 100,
		marginTop: 2,
		backgroundColor: colors.grey100,
	},
	network: {
		flex: 1,
		flexDirection: 'row',
		paddingVertical: 12,
	},
	networkWrapper: {
		flex: 0,
		flexDirection: 'row',
	},
	networkLabel: {
		fontSize: 16,
		color: colors.fontPrimary,
		...fontStyles.normal,
	},
	sectionLabel: {
		fontSize: 14,
		paddingVertical: 12,
		color: colors.fontPrimary,
		...fontStyles.bold,
	},
});

/**
 * Main view for app configurations
 */
class NetworksSettings extends PureComponent {
	static propTypes = {
		/**
		 * A list of custom RPCs to provide the user
		 */
		frequentRpcList: PropTypes.array,
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * NetworkController povider object
		 */
		provider: PropTypes.object,
		/**
		 * Indicates whether third party API mode is enabled
		 */
		thirdPartyApiMode: PropTypes.bool,
	};

	actionSheet = null;
	networkToRemove = null;

	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(strings('app_settings.networks_title'), navigation);

	state = {};

	getOtherNetworks = () => getAllNetworks().slice(1);

	onPress = (network) => {
		const { navigation } = this.props;
		navigation.navigate('NetworkSettings', { network });
	};

	onAddNetwork = () => {
		const { navigation } = this.props;
		navigation.navigate('NetworkSettings');
	};

	showRemoveMenu = (network) => {
		this.networkToRemove = network;
		this.actionSheet.show();
	};

	switchToMainnet = () => {
		const { NetworkController, CurrencyRateController } = Engine.context;
		CurrencyRateController.setNativeCurrency('ETH');
		NetworkController.setProviderType(MAINNET);
		this.props.thirdPartyApiMode &&
			setTimeout(() => {
				Engine.refreshTransactionHistory();
			}, 1000);
	};

	removeNetwork = () => {
		// Check if it's the selected network and then switch to mainnet first
		const { provider } = this.props;
		if (provider.rpcTarget === this.networkToRemove && provider.type === RPC) {
			this.switchToMainnet();
		}
		const { PreferencesController } = Engine.context;
		PreferencesController.removeFromFrequentRpcList(this.networkToRemove);
	};

	createActionSheetRef = (ref) => {
		this.actionSheet = ref;
	};

	onActionSheetPress = (index) => (index === 0 ? this.removeNetwork() : null);

	networkElement(name, color, i, network, isCustomRPC) {
		return (
			<TouchableOpacity
				key={`network-${i}`}
				onPress={() => this.onPress(network)} // eslint-disable-line
				onLongPress={() => isCustomRPC && this.showRemoveMenu(network)} // eslint-disable-line
				testID={'select-network'}
			>
				<View style={styles.network}>
					<View style={[styles.networkIcon, color ? { backgroundColor: color } : styles.otherNetworkIcon]} />
					<View style={styles.networkInfo}>
						<Text style={styles.networkLabel}>{name}</Text>
					</View>
				</View>
			</TouchableOpacity>
		);
	}

	renderOtherNetworks() {
		return this.getOtherNetworks().map((network, i) => {
			const { color, name } = Networks[network];
			return this.networkElement(name, color, i, network, false);
		});
	}

	renderRpcNetworks = () => {
		const { frequentRpcList } = this.props;
		return frequentRpcList.map(({ rpcUrl, nickname }, i) => {
			const { color, name } = { name: nickname || rpcUrl, color: null };

			return this.networkElement(name, color, i, rpcUrl, true);
		});
	};

	renderRpcNetworksView = () => {
		const { frequentRpcList } = this.props;
		if (frequentRpcList.length > 0) {
			return (
				<View testID={'rpc-networks'}>
					<Text style={styles.sectionLabel}>{strings('app_settings.network_rpc_networks')}</Text>
					{this.renderRpcNetworks()}
				</View>
			);
		}
	};

	renderMainnet() {
		const { color: mainnetColor, name: mainnetName } = Networks.mainnet;
		return (
			<View style={styles.mainnetHeader}>
				<TouchableOpacity
					style={styles.network}
					key={`network-${MAINNET}`}
					onPress={() => this.onPress(MAINNET)} // eslint-disable-line
				>
					<View style={styles.networkWrapper}>
						<View style={[styles.networkIcon, { backgroundColor: mainnetColor }]} />
						<View style={styles.networkInfo}>
							<Text style={styles.networkLabel}>{mainnetName}</Text>
						</View>
					</View>
				</TouchableOpacity>
			</View>
		);
	}

	render() {
		return (
			<View style={styles.wrapper} testID={'networks-screen'}>
				<ScrollView style={styles.networksWrapper}>
					{this.renderMainnet()}
					<Text style={styles.sectionLabel}>{strings('app_settings.network_other_networks')}</Text>
					{this.renderOtherNetworks()}
					{this.renderRpcNetworksView()}
				</ScrollView>
				<StyledButton
					type="confirm"
					onPress={this.onAddNetwork}
					containerStyle={styles.syncConfirm}
					testID={'add-network-button'}
				>
					{strings('app_settings.network_add_network')}
				</StyledButton>
				<ActionSheet
					ref={this.createActionSheetRef}
					title={strings('app_settings.remove_network_title')}
					options={[strings('app_settings.remove_network'), strings('app_settings.cancel_remove_network')]}
					cancelButtonIndex={1}
					destructiveButtonIndex={0}
					onPress={this.onActionSheetPress}
				/>
			</View>
		);
	}
}

const mapStateToProps = (state) => ({
	provider: state.engine.backgroundState.NetworkController.provider,
	frequentRpcList: state.engine.backgroundState.PreferencesController.frequentRpcList,
	thirdPartyApiMode: state.privacy.thirdPartyApiMode,
});

export default connect(mapStateToProps)(NetworksSettings);
