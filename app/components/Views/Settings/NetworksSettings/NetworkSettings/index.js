import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../../UI/Navbar';
import { strings } from '../../../../../../locales/i18n';
import Networks from '../../../../../util/networks';
import { getEtherscanBaseUrl } from '../../../../../util/etherscan';
import StyledButton from '../../../../UI/StyledButton';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 24,
		marginBottom: 24
	},
	informationWrapper: {
		flex: 1
	},
	input: {
		...fontStyles.normal,
		borderColor: colors.grey200,
		borderRadius: 5,
		borderWidth: 2,
		padding: 10
	},
	rpcConfirmContainer: {
		marginTop: 12,
		flexDirection: 'row'
	},
	warningText: {
		...fontStyles.normal,
		color: colors.red,
		marginTop: 4,
		paddingLeft: 2,
		paddingRight: 4
	},
	warningContainer: {
		flexGrow: 1,
		flexShrink: 1
	},
	label: {
		fontSize: 14,
		paddingVertical: 12,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	title: {
		fontSize: 20,
		paddingVertical: 12,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	desc: {
		fontSize: 14,
		color: colors.fontPrimary,
		...fontStyles.normal
	}
});

const allNetworks = ['mainnet', 'ropsten', 'kovan', 'rinkeby'];
const allNetworksBlocktracker = `https://api.infura.io/v1/jsonrpc/`;
/**
 * Main view for app configurations
 */
class NetworkSettings extends Component {
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

	state = {
		network: undefined,
		blockTracker: undefined,
		name: undefined,
		chainId: undefined,
		ticker: undefined,
		editable: undefined,
		addMode: false
	};

	getOtherNetworks = () => allNetworks.slice(1);

	componentDidMount = () => {
		const { navigation, frequentRpcList } = this.props;
		let network = navigation.getParam('network', undefined);
		let blockTracker, chainId, name, ticker, editable;
		if (network) {
			if (allNetworks.find(net => network === net)) {
				blockTracker = getEtherscanBaseUrl(network);
				const networkInformation = Networks[network];
				name = networkInformation.name;
				chainId = networkInformation.chainId.toString();
				editable = false;
				network = allNetworksBlocktracker + network;
				ticker = strings('unit.eth');
			} else {
				const networkInformation = frequentRpcList.find(({ rpcUrl }) => rpcUrl === network);
				name = networkInformation.nickname;
				chainId = networkInformation.chainId;
				blockTracker = networkInformation.blockTracker;
				ticker = networkInformation.ticker;
				editable = true;
			}
			this.setState({ network, blockTracker, name, chainId, ticker, editable });
		} else {
			this.setState({ addMode: true });
		}
	};

	render() {
		const { network, blockTracker, name, chainId, ticker, editable, addMode } = this.state;
		return (
			<View style={styles.wrapper}>
				<KeyboardAwareScrollView style={styles.informationWrapper}>
					<View>
						{addMode && <Text style={styles.title}>{strings('app_settings.new_RPC_URL')}</Text>}
						{addMode && <Text style={styles.desc}>{strings('app_settings.rpc_desc')}</Text>}

						<Text style={styles.label}>Network Name</Text>

						<TextInput
							style={[styles.input, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={name}
							editable={editable}
							onChangeText={this.onNicknameChange}
							placeholder={'Nickname (optional)'}
						/>

						<Text style={styles.label}>RPC Url</Text>
						<TextInput
							style={[styles.input, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={network}
							editable={editable}
							onChangeText={this.onRpcUrlChange}
							placeholder={strings('app_settings.new_RPC_URL')}
						/>

						<Text style={styles.label}>Chain ID</Text>
						<TextInput
							style={[styles.input, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={chainId}
							editable={editable}
							onChangeText={this.onChainIDChange}
							placeholder={'Chain ID (optional)'}
						/>

						<Text style={styles.label}>Symbol</Text>

						<TextInput
							style={[styles.input, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={ticker}
							editable={editable}
							onChangeText={this.onTickerChange}
							placeholder={'Symbol (optional)'}
						/>

						<Text style={styles.label}>Block Explorer URL</Text>

						<TextInput
							style={[styles.input, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={blockTracker}
							editable={editable}
							onChangeText={this.onNicknameChange}
							placeholder={'Block Explorer URL (optional)'}
						/>

						<View style={styles.rpcConfirmContainer}>
							<View style={styles.warningContainer}>
								<Text style={styles.warningText}>{this.state.warningRpcUrl}</Text>
							</View>
						</View>
					</View>
				</KeyboardAwareScrollView>
				{(addMode || editable) && (
					<StyledButton type="confirm" onPress={this.addRpcUrl} containerStyle={styles.syncConfirm}>
						{editable ? 'Save' : 'Add'}
					</StyledButton>
				)}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	frequentRpcList: state.engine.backgroundState.PreferencesController.frequentRpcList
});

export default connect(mapStateToProps)(NetworkSettings);
