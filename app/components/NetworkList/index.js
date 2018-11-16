import React, { Component } from 'react';
import Engine from '../../core/Engine';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import { ScrollView, TouchableOpacity, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import Networks from '../../util/networks';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderRadius: 10,
		minHeight: 450
	},
	titleWrapper: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor
	},
	title: {
		textAlign: 'center',
		fontSize: 18,
		marginVertical: 12,
		marginHorizontal: 20,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	otherNetworksHeader: {
		marginTop: 0,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor
	},
	otherNetworksText: {
		textAlign: 'left',
		fontSize: 13,
		marginVertical: 12,
		marginHorizontal: 20,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	networksWrapper: {
		flex: 1
	},
	network: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor,
		flexDirection: 'row',
		paddingHorizontal: 20,
		paddingVertical: 20,
		paddingLeft: 45
	},
	mainnet: {
		borderBottomWidth: 0,
		flexDirection: 'column'
	},
	networkInfo: {
		marginLeft: 15,
		flex: 1
	},
	networkLabel: {
		fontSize: 16,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	footer: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor,
		height: 60,
		justifyContent: 'center',
		flexDirection: 'row',
		alignItems: 'center'
	},
	closeButton: {
		fontSize: 16,
		color: colors.primary,
		...fontStyles.normal
	},
	networkIcon: {
		width: 15,
		height: 15,
		borderRadius: 100,
		marginTop: 3
	},
	networkWrapper: {
		flex: 0,
		flexDirection: 'row'
	},
	mainnetStatus: {
		fontSize: 12,
		marginLeft: 30,
		marginTop: 5,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	selected: {
		position: 'absolute',
		marginLeft: 20,
		marginTop: 22
	},
	mainnetSelected: {
		marginLeft: -30,
		marginTop: 3
	},
	otherNetworkIcon: {
		backgroundColor: colors.transparent,
		borderColor: colors.borderColor,
		borderWidth: 2
	}
});

/**
 * View that contains the list of all the available networks
 */
export default class NetworkList extends Component {
	static propTypes = {
		/**
		 * An function to handle the close event
		 */
		onClose: PropTypes.func,
		/**
		 * A list of custom RPCs to provide the user
		 */
		frequentRpcList: PropTypes.array
	};

	getAllNetworks = () => ['mainnet', 'ropsten', 'kovan', 'rinkeby'].concat(this.props.frequentRpcList);

	getOtherNetworks = () => this.getAllNetworks().slice(1);

	onNetworkChange = async type => {
		const { NetworkController } = Engine.context;
		NetworkController.setProviderType(type);
	};

	renderOtherNetworks() {
		const { NetworkController } = Engine.context;
		return this.getOtherNetworks().map((network, i) => {
			const { color, name } = Networks[network] || { ...Networks.rpc, color: null };
			const selected =
				NetworkController.state.provider.type === network ? (
					<Icon name="check" size={15} color={colors.fontSecondary} />
				) : null;
			return (
				<TouchableOpacity
					style={styles.network}
					key={`network-${i}`}
					onPress={() => this.onNetworkChange(network)} // eslint-disable-line
				>
					<View style={styles.selected}>{selected}</View>
					<View style={[styles.networkIcon, color ? { backgroundColor: color } : styles.otherNetworkIcon]} />
					<View style={styles.networkInfo}>
						<Text style={styles.networkLabel}>{name}</Text>
					</View>
				</TouchableOpacity>
			);
		});
	}

	renderMainnet() {
		const { NetworkController, NetworkStatusController } = Engine.context;
		const isMainnet =
			NetworkController.state.provider.type === 'mainnet' ? (
				<Icon name="check" size={15} color={colors.fontSecondary} />
			) : null;
		const { color: mainnetColor, name: mainnetName } = Networks.mainnet;

		return (
			<View style={styles.mainnetHeader}>
				<TouchableOpacity
					style={[styles.network, styles.mainnet]}
					key={`network-mainnet`}
					onPress={() => this.onNetworkChange('mainnet')} // eslint-disable-line
				>
					<View style={styles.networkWrapper}>
						<View style={[styles.selected, styles.mainnetSelected]}>{isMainnet}</View>
						<View style={[styles.networkIcon, { backgroundColor: mainnetColor }]} />
						<View style={styles.networkInfo}>
							<Text style={styles.networkLabel}>{mainnetName}</Text>
						</View>
					</View>
					<View>
						<Text style={styles.mainnetStatus}>
							{NetworkStatusController.state.networkStatus.infura.mainnet
								? strings('networks.status_ok')
								: strings('networks.status_not_ok')}
						</Text>
					</View>
				</TouchableOpacity>
			</View>
		);
	}

	render() {
		return (
			<SafeAreaView style={styles.wrapper} testID={'account-list'}>
				<View style={styles.titleWrapper}>
					<Text testID={'networks-list-title'} style={styles.title} onPress={this.closeSideBar}>
						{strings('networks.title')}
					</Text>
				</View>
				<ScrollView style={styles.networksWrapper}>
					{this.renderMainnet()}
					<View style={styles.otherNetworksHeader}>
						<Text style={styles.otherNetworksText}>{strings('networks.other_networks')}</Text>
					</View>
					{this.renderOtherNetworks()}
				</ScrollView>
				<View style={styles.footer}>
					<TouchableOpacity onPress={this.props.onClose}>
						<Text style={styles.closeButton}>{strings('networks.close')}</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}
}
