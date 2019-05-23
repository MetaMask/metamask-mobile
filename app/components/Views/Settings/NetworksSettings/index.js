import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { StyleSheet, Text, ScrollView, TouchableOpacity, View } from 'react-native';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { strings } from '../../../../../locales/i18n';
import Networks, { getAllNetworks } from '../../../../util/networks';
import StyledButton from '../../../UI/StyledButton';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 24,
		marginBottom: 24
	},
	networkIcon: {
		width: 15,
		height: 15,
		borderRadius: 100,
		marginTop: 2,
		marginRight: 16
	},
	otherNetworkIcon: {
		width: 15,
		height: 15,
		borderRadius: 100,
		marginTop: 2,
		backgroundColor: colors.grey100
	},
	network: {
		flex: 1,
		flexDirection: 'row',
		paddingVertical: 12
	},
	networkWrapper: {
		flex: 0,
		flexDirection: 'row'
	},
	networkLabel: {
		fontSize: 16,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	sectionLabel: {
		fontSize: 14,
		paddingVertical: 12,
		color: colors.fontPrimary,
		...fontStyles.bold
	}
});

/**
 * Main view for app configurations
 */
class NetworksSettings extends Component {
	static propTypes = {
		/**
		 * A list of custom RPCs to provide the user
		 */
		frequentRpcList: PropTypes.array,
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(strings('app_settings.networks_title'), navigation);

	state = {};

	getOtherNetworks = () => getAllNetworks().slice(1);

	onPress = network => {
		const { navigation } = this.props;
		navigation.navigate('NetworkSettings', { network });
	};

	onAddNetwork = () => {
		const { navigation } = this.props;
		navigation.navigate('NetworkSettings');
	};

	networkElement(name, color, i, network) {
		return (
			<TouchableOpacity
				key={`network-${i}`}
				onPress={() => this.onPress(network)} // eslint-disable-line
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
			return this.networkElement(name, color, i, network);
		});
	}

	renderRpcNetworks = () => {
		const { frequentRpcList } = this.props;
		return frequentRpcList.map(({ rpcUrl, nickname }, i) => {
			const { color, name } = { name: nickname || rpcUrl, color: null };

			return this.networkElement(name, color, i, rpcUrl);
		});
	};

	renderRpcNetworksView = () => {
		const { frequentRpcList } = this.props;
		if (frequentRpcList.length > 0) {
			return (
				<View>
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
					key={`network-mainnet`}
					onPress={() => this.onPress('mainnet')} // eslint-disable-line
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
			<View style={styles.wrapper}>
				<ScrollView style={styles.networksWrapper}>
					{this.renderMainnet()}
					<Text style={styles.sectionLabel}>{strings('app_settings.network_other_networks')}</Text>
					{this.renderOtherNetworks()}
					{this.renderRpcNetworksView()}
				</ScrollView>
				<StyledButton type="confirm" onPress={this.onAddNetwork} containerStyle={styles.syncConfirm}>
					{strings('app_settings.network_add_network')}
				</StyledButton>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	frequentRpcList: state.engine.backgroundState.PreferencesController.frequentRpcList
});

export default connect(mapStateToProps)(NetworksSettings);
