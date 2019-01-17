import React, { Component } from 'react';
import Engine from '../../core/Engine';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import { InteractionManager, ScrollView, TouchableOpacity, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import Networks from '../../util/networks';
import { connect } from 'react-redux';

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
	footerButton: {
		flex: 1,
		alignContent: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		height: 60
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
export class NetworkList extends Component {
	static propTypes = {
		/**
		 * An function to handle the close event
		 */
		onClose: PropTypes.func,
		/**
		 * A list of custom RPCs to provide the user
		 */
		frequentRpcList: PropTypes.array,
		/**
		 * NetworkController povider object
		 */
		provider: PropTypes.object,
		/**
		 * Networks status object
		 */
		networkStatus: PropTypes.object
	};

	getAllNetworks = () => ['mainnet', 'ropsten', 'kovan', 'rinkeby'];

	getOtherNetworks = () => this.getAllNetworks().slice(1);

	onNetworkChange = async type => {
		const { NetworkController } = Engine.context;
		NetworkController.setProviderType(type);
		setTimeout(() => {
			this.props.onClose(false);
			InteractionManager.runAfterInteractions(() => Engine.refreshTransactionHistory());
		}, 300);
	};

	closeModal = () => {
		this.props.onClose(true);
	};

	onSetRpcTarget = async rpcTarget => {
		const { NetworkController } = Engine.context;
		NetworkController.setRpcTarget(rpcTarget);
	};

	removeRpcTarget = rpcTarget => {
		const { PreferencesController } = Engine.context;
		PreferencesController.removeFromFrequentRpcList(rpcTarget);
	};

	networkElement = (selected, onPress, name, color, i, network) => (
		<TouchableOpacity
			style={styles.network}
			key={`network-${i}`}
			onPress={() => onPress(network)} // eslint-disable-line
		>
			<View style={styles.selected}>{selected}</View>
			<View style={[styles.networkIcon, color ? { backgroundColor: color } : styles.otherNetworkIcon]} />
			<View style={styles.networkInfo}>
				<Text style={styles.networkLabel}>{name}</Text>
			</View>
		</TouchableOpacity>
	);

	renderOtherNetworks = () => {
		const { provider } = this.props;
		return this.getOtherNetworks().map((network, i) => {
			const { color, name } = Networks[network];
			const selected =
				provider.type === network ? <Icon name="check" size={20} color={colors.fontSecondary} /> : null;
			return this.networkElement(selected, this.onNetworkChange, name, color, i, network);
		});
	};

	renderRpcNetworks = () => {
		const { frequentRpcList, provider } = this.props;
		return frequentRpcList.map((network, i) => {
			const { color, name } = { name: network, color: null };
			const selected =
				provider.rpcTarget === network && provider.type === 'rpc' ? (
					<Icon name="check" size={20} color={colors.fontSecondary} />
				) : (
					<Icon
						name="minus-circle"
						size={20}
						color={colors.fontTertiary}
						onPress={() => this.removeRpcTarget(network)} // eslint-disable-line
					/>
				);
			return this.networkElement(selected, this.onSetRpcTarget, name, color, i, network);
		});
	};

	renderMainnet() {
		const { provider, networkStatus } = this.props;
		const isMainnet =
			provider.type === 'mainnet' ? <Icon name="check" size={15} color={colors.fontSecondary} /> : null;
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
							{networkStatus.infura.mainnet
								? strings('networks.status_ok')
								: strings('networks.status_not_ok')}
						</Text>
					</View>
				</TouchableOpacity>
			</View>
		);
	}

	render = () => (
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
				{this.renderRpcNetworks()}
			</ScrollView>
			<View style={styles.footer}>
				<TouchableOpacity style={styles.footerButton} onPress={this.closeModal}>
					<Text style={styles.closeButton}>{strings('networks.close')}</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}

const mapStateToProps = state => ({
	provider: state.engine.backgroundState.NetworkController.provider,
	frequentRpcList: state.engine.backgroundState.PreferencesController.frequentRpcList,
	networkStatus: state.engine.backgroundState.NetworkStatusController.networkStatus
});

export default connect(mapStateToProps)(NetworkList);
