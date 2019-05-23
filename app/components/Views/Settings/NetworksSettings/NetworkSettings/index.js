import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../../UI/Navbar';
import { strings } from '../../../../../../locales/i18n';
import Networks, { isprivateConnection } from '../../../../../util/networks';
import { getEtherscanBaseUrl } from '../../../../../util/etherscan';
import StyledButton from '../../../../UI/StyledButton';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Engine from '../../../../../core/Engine';
import { isWebUri } from 'valid-url';
import URL from 'url-parse';

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
	warningText: {
		...fontStyles.normal,
		color: colors.red,
		marginTop: 4,
		paddingLeft: 2,
		paddingRight: 4
	},
	warningContainer: {
		marginTop: 4,
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
const allNetworksblockExplorerUrl = `https://api.infura.io/v1/jsonrpc/`;
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
		rpcUrl: undefined,
		blockExplorerUrl: undefined,
		nickname: undefined,
		chainId: undefined,
		ticker: undefined,
		editable: undefined,
		addMode: false,
		warningRpcUrl: undefined,
		warningChainId: undefined,
		validatedRpcURL: true,
		validatedChainId: true,
		initialState: undefined,
		enableAction: false
	};

	inputRpcURL = React.createRef();
	inputChainId = React.createRef();
	inputSymbol = React.createRef();
	inputBlockExplorerURL = React.createRef();

	getOtherNetworks = () => allNetworks.slice(1);

	componentDidMount = () => {
		const { navigation, frequentRpcList } = this.props;
		const network = navigation.getParam('network', undefined);
		let blockExplorerUrl, chainId, nickname, ticker, editable, rpcUrl;
		if (network) {
			if (allNetworks.find(net => network === net)) {
				blockExplorerUrl = getEtherscanBaseUrl(network);
				const networkInformation = Networks[network];
				nickname = networkInformation.name;
				chainId = networkInformation.chainId.toString();
				editable = false;
				rpcUrl = allNetworksblockExplorerUrl + network;
				ticker = strings('unit.eth');
			} else {
				const networkInformation = frequentRpcList.find(({ rpcUrl }) => rpcUrl === network);
				nickname = networkInformation.nickname;
				chainId = networkInformation.chainId;
				blockExplorerUrl = networkInformation.rpcPrefs && networkInformation.rpcPrefs.blockExplorerUrl;
				ticker = networkInformation.ticker;
				editable = true;
				rpcUrl = network;
			}
			const initialState = rpcUrl + blockExplorerUrl + nickname + chainId + ticker + editable;
			this.setState({ rpcUrl, blockExplorerUrl, nickname, chainId, ticker, editable, initialState });
		} else {
			this.setState({ addMode: true });
		}
	};

	addRpcUrl = () => {
		const { PreferencesController, NetworkController } = Engine.context;
		const { rpcUrl, chainId, ticker, nickname, blockExplorerUrl } = this.state;
		const { navigation } = this.props;
		if (this.validateRpcUrl()) {
			const url = new URL(rpcUrl);
			!isprivateConnection(url.hostname) && url.set('protocol', 'https:');
			PreferencesController.addToFrequentRpcList(url.href, chainId, ticker, nickname, { blockExplorerUrl });
			NetworkController.setRpcTarget(url.href, chainId, ticker, nickname);
			navigation.navigate('WalletView');
		}
	};

	validateRpcUrl = () => {
		const { rpcUrl } = this.state;
		if (!isWebUri(rpcUrl)) {
			const appendedRpc = `http://${rpcUrl}`;
			if (isWebUri(appendedRpc)) {
				this.setState({ warningRpcUrl: strings('app_settings.invalid_rpc_prefix') });
			} else {
				this.setState({ warningRpcUrl: strings('app_settings.invalid_rpc_url') });
			}
			return false;
		}
		const url = new URL(rpcUrl);
		const privateConnection = isprivateConnection(url.hostname);
		if (!privateConnection && url.protocol === 'http:') {
			this.setState({ warningRpcUrl: strings('app_settings.invalid_rpc_prefix') });
			return false;
		}
		this.setState({ validatedRpcURL: true });
		return true;
	};

	validateChainId = () => {
		const { chainId } = this.state;
		if (!Number.isInteger(Number(chainId))) {
			this.setState({ warningChainId: 'Invalid Chain ID', validatedChainId: true });
		} else {
			this.setState({ warningChainId: undefined, validatedChainId: true });
		}
	};

	getCurrentState = () => {
		const { rpcUrl, blockExplorerUrl, nickname, chainId, ticker, editable, initialState } = this.state;
		const actualState = rpcUrl + blockExplorerUrl + nickname + chainId + ticker + editable;
		let enableAction;
		if (actualState !== initialState) {
			//enable editing/ saving
			enableAction = true;
		} else {
			enableAction = false;
		}
		this.setState({ enableAction });
	};

	onRpcUrlChange = async url => {
		await this.setState({ rpcUrl: url, validatedRpcURL: false });
		this.getCurrentState();
	};

	onNicknameChange = async nickname => {
		await this.setState({ nickname });
		this.getCurrentState();
	};

	onChainIDChange = async chainId => {
		await this.setState({ chainId, validatedChainId: false });
		this.getCurrentState();
	};

	onTickerChange = async ticker => {
		await this.setState({ ticker });
		this.getCurrentState();
	};

	onBlockExplorerUrlChange = async blockExplorerUrl => {
		await this.setState({ blockExplorerUrl });
		this.getCurrentState();
	};

	jumpToRpcURL = () => {
		const { current } = this.inputRpcURL;
		current && current.focus();
	};
	jumpToChainId = () => {
		const { current } = this.inputChainId;
		current && current.focus();
	};
	jumpToSymbol = () => {
		const { current } = this.inputSymbol;
		current && current.focus();
	};
	jumpBlockExplorerURL = () => {
		const { current } = this.inputBlockExplorerURL;
		current && current.focus();
	};

	render() {
		const {
			rpcUrl,
			blockExplorerUrl,
			nickname,
			chainId,
			ticker,
			editable,
			addMode,
			warningRpcUrl,
			warningChainId,
			validatedChainId,
			validatedRpcURL,
			enableAction
		} = this.state;
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
							value={nickname}
							editable={editable}
							onChangeText={this.onNicknameChange}
							placeholder={'Nickname (optional)'}
							onSubmitEditing={this.jumpToRpcURL}
						/>

						<Text style={styles.label}>RPC Url</Text>
						<TextInput
							ref={this.inputRpcURL}
							style={[styles.input, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={rpcUrl}
							editable={editable}
							onChangeText={this.onRpcUrlChange}
							onBlur={this.validateRpcUrl}
							placeholder={strings('app_settings.new_RPC_URL')}
							onSubmitEditing={this.jumpToChainId}
						/>

						{warningRpcUrl && (
							<View style={styles.warningContainer}>
								<Text style={styles.warningText}>{warningRpcUrl}</Text>
							</View>
						)}

						<Text style={styles.label}>Chain ID</Text>
						<TextInput
							ref={this.inputChainId}
							style={[styles.input, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={chainId}
							editable={editable}
							onChangeText={this.onChainIDChange}
							onBlur={this.validateChainId}
							placeholder={'Chain ID (optional)'}
							onSubmitEditing={this.jumpToSymbol}
						/>

						{warningChainId && (
							<View style={styles.warningContainer}>
								<Text style={styles.warningText}>{warningChainId}</Text>
							</View>
						)}

						<Text style={styles.label}>Symbol</Text>

						<TextInput
							ref={this.inputSymbol}
							style={[styles.input, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={ticker}
							editable={editable}
							onChangeText={this.onTickerChange}
							placeholder={'Symbol (optional)'}
							onSubmitEditing={this.jumpBlockExplorerURL}
						/>

						<Text style={styles.label}>Block Explorer URL</Text>

						<TextInput
							ref={this.inputBlockExplorerURL}
							style={[styles.input, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={blockExplorerUrl}
							editable={editable}
							onChangeText={this.onBlockExplorerUrlChange}
							placeholder={'Block Explorer URL (optional)'}
							onSubmitEditing={this.addRpcUrl}
						/>
					</View>
				</KeyboardAwareScrollView>
				{(addMode || editable) && (
					<StyledButton
						type="confirm"
						onPress={this.addRpcUrl}
						containerStyle={styles.syncConfirm}
						disabled={
							!enableAction ||
							(!rpcUrl || (rpcUrl && !validatedRpcURL) || (rpcUrl && warningRpcUrl !== undefined)) ||
							((chainId && !validatedChainId) || (chainId && warningChainId !== undefined))
						}
					>
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
