import React, { PureComponent } from 'react';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import { InteractionManager, ScrollView, TouchableOpacity, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Networks, { getAllNetworks } from '../../../util/networks';
import { connect } from 'react-redux';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';

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
	otherNetworksHeader: {
		marginTop: 0,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100
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
		borderColor: colors.grey100,
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
	selected: {
		position: 'absolute',
		marginLeft: 20,
		marginTop: 20
	},
	mainnetSelected: {
		marginLeft: -30,
		marginTop: 3
	},
	otherNetworkIcon: {
		backgroundColor: colors.transparent,
		borderColor: colors.grey100,
		borderWidth: 2
	}
});

/**
 * View that contains the list of all the available networks
 */
export class NetworkList extends PureComponent {
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
		 * Indicates whether third party API mode is enabled
		 */
		thirdPartyApiMode: PropTypes.bool
	};

	getOtherNetworks = () => getAllNetworks().slice(1);

	onNetworkChange = type => {
		const { provider } = this.props;
		requestAnimationFrame(() => {
			this.props.onClose(false);
			InteractionManager.runAfterInteractions(() => {
				const { NetworkController, CurrencyRateController } = Engine.context;
				CurrencyRateController.configure({ nativeCurrency: 'ETH' });
				NetworkController.setProviderType(type);
				this.props.thirdPartyApiMode &&
					setTimeout(() => {
						Engine.refreshTransactionHistory();
					}, 1000);
				Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.COMMON_SWITCHED_NETWORKS, {
					'From Network': provider.type,
					'To Network': type
				});
			});
		});
	};

	closeModal = () => {
		this.props.onClose(true);
	};

	onSetRpcTarget = async rpcTarget => {
		const { frequentRpcList } = this.props;
		const { NetworkController, CurrencyRateController } = Engine.context;
		const rpc = frequentRpcList.find(({ rpcUrl }) => rpcUrl === rpcTarget);
		const { rpcUrl, chainId, ticker, nickname } = rpc;
		CurrencyRateController.configure({ nativeCurrency: ticker });
		NetworkController.setRpcTarget(rpcUrl, chainId, ticker, nickname);
		this.props.onClose(false);
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
		return frequentRpcList.map(({ nickname, rpcUrl }, i) => {
			const { color, name } = { name: nickname || rpcUrl, color: null };
			const selected =
				provider.rpcTarget === rpcUrl && provider.type === 'rpc' ? (
					<Icon name="check" size={20} color={colors.fontSecondary} />
				) : null;
			return this.networkElement(selected, this.onSetRpcTarget, name, color, i, rpcUrl);
		});
	};

	renderMainnet() {
		const { provider } = this.props;
		const isMainnet =
			provider.type === 'mainnet' ? <Icon name="check" size={15} color={colors.fontSecondary} /> : null;
		const { color: mainnetColor, name: mainnetName } = Networks.mainnet;

		return (
			<View style={styles.mainnetHeader}>
				<TouchableOpacity
					style={[styles.network, styles.mainnet]}
					key={`network-mainnet`}
					onPress={() => this.onNetworkChange('mainnet')} // eslint-disable-line
					testID={'network-name'}
				>
					<View style={styles.networkWrapper}>
						<View style={[styles.selected, styles.mainnetSelected]}>{isMainnet}</View>
						<View style={[styles.networkIcon, { backgroundColor: mainnetColor }]} />
						<View style={styles.networkInfo}>
							<Text style={styles.networkLabel}>{mainnetName}</Text>
						</View>
					</View>
				</TouchableOpacity>
			</View>
		);
	}

	render = () => (
		<SafeAreaView style={styles.wrapper} testID={'networks-list'}>
			<View style={styles.titleWrapper}>
				<Text testID={'networks-list-title'} style={styles.title} onPress={this.closeSideBar}>
					{strings('networks.title')}
				</Text>
			</View>
			<ScrollView style={styles.networksWrapper}>
				{this.renderMainnet()}
				<View style={styles.otherNetworksHeader}>
					<Text style={styles.otherNetworksText} testID={'other-network-name'}>
						{strings('networks.other_networks')}
					</Text>
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
	thirdPartyApiMode: state.privacy.thirdPartyApiMode
});

export default connect(mapStateToProps)(NetworkList);
