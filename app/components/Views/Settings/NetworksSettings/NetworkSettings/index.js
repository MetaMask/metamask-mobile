import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { StyleSheet, Text, View, TextInput, SafeAreaView } from 'react-native';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../../UI/Navbar';
import { strings } from '../../../../../../locales/i18n';
import Networks, { isprivateConnection } from '../../../../../util/networks';
import { getEtherscanBaseUrl } from '../../../../../util/etherscan';
import StyledButton from '../../../../UI/StyledButton';
import Engine from '../../../../../core/Engine';
import { isWebUri } from 'valid-url';
import URL from 'url-parse';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		flexDirection: 'column'
	},
	informationWrapper: {
		flex: 1,
		paddingHorizontal: 24
	},
	scrollWrapper: {
		flex: 1,
		paddingVertical: 12
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
	},
	buttonsWrapper: {
		marginVertical: 12,
		flexDirection: 'row',
		alignSelf: 'flex-end'
	},
	buttonsContainer: {
		flex: 1,
		flexDirection: 'column',
		alignSelf: 'flex-end'
	}
});

const allNetworks = ['mainnet', 'ropsten', 'kovan', 'rinkeby', 'goerli'];
const allNetworksblockExplorerUrl = `https://api.infura.io/v1/jsonrpc/`;
/**
 * Main view for app configurations
 */
class NetworkSettings extends PureComponent {
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
		enableAction: false,
		inputWidth: { width: '99%' }
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
		// If no navigation param, user clicked on add network
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
		setTimeout(() => {
			this.setState({
				inputWidth: { width: '100%' }
			});
		}, 100);
	};

	/**
	 * Add rpc url and parameters to PreferencesController
	 * Setting NetworkController provider to this custom rpc
	 */
	addRpcUrl = () => {
		const { PreferencesController, NetworkController, CurrencyRateController } = Engine.context;
		const { rpcUrl, chainId, nickname, blockExplorerUrl } = this.state;
		const ticker = this.state.ticker && this.state.ticker.toUpperCase();
		const { navigation } = this.props;
		if (this.validateRpcUrl()) {
			const url = new URL(rpcUrl);
			!isprivateConnection(url.hostname) && url.set('protocol', 'https:');
			CurrencyRateController.configure({ nativeCurrency: ticker });
			PreferencesController.addToFrequentRpcList(url.href, chainId, ticker, nickname, {
				blockExplorerUrl
			});
			NetworkController.setRpcTarget(url.href, chainId, ticker, nickname);
			navigation.navigate('WalletView');
		}
	};

	/**
	 * Validates rpc url, setting a warningRpcUrl if is invalid
	 * It also changes validatedRpcURL to true, indicating that was validated
	 */
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
		this.setState({ validatedRpcURL: true, warningRpcUrl: undefined });
		return true;
	};

	/**
	 * Validates that chain id is a valid integer number, setting a warningChainId if is invalid
	 */
	validateChainId = () => {
		const { chainId } = this.state;
		if (chainId && !Number.isInteger(Number(chainId))) {
			this.setState({ warningChainId: strings('app_settings.network_chain_id_warning'), validatedChainId: true });
		} else {
			this.setState({ warningChainId: undefined, validatedChainId: true });
		}
	};

	/**
	 * Allows to identify if any element of the form changed, in order to enable add or save button
	 */
	getCurrentState = () => {
		const { rpcUrl, blockExplorerUrl, nickname, chainId, ticker, editable, initialState } = this.state;
		const actualState = rpcUrl + blockExplorerUrl + nickname + chainId + ticker + editable;
		let enableAction;
		// If concstenation of parameters changed, user changed something so we are going to enable the action button
		if (actualState !== initialState) {
			enableAction = true;
		} else {
			enableAction = false;
		}
		this.setState({ enableAction });
	};

	/**
	 * Returns if action button should be disabled because of the rpc url
	 * No rpc url set or rpc url set but, rpc url has not been validated yet or there is a warning for rpc url
	 */
	disabledByRpcUrl = () => {
		const { rpcUrl, validatedRpcURL, warningRpcUrl } = this.state;
		return !rpcUrl || (rpcUrl && (!validatedRpcURL || warningRpcUrl !== undefined));
	};

	/**
	 * Returns if action button should be disabled because of the rpc url
	 * Chain ID set but, chain id has not been validated yet or there is a warning for chain id
	 */
	disabledByChainId = () => {
		const { chainId, validatedChainId, warningChainId } = this.state;
		return chainId !== undefined && (!validatedChainId || warningChainId !== undefined);
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
			enableAction,
			inputWidth
		} = this.state;
		return (
			<SafeAreaView style={styles.wrapper} testID={'new-rpc-screen'}>
				<KeyboardAwareScrollView style={styles.informationWrapper}>
					<View style={styles.scrollWrapper}>
						{addMode && (
							<Text style={styles.title} testID={'rpc-screen-title'}>
								{strings('app_settings.new_RPC_URL')}
							</Text>
						)}
						{addMode && <Text style={styles.desc}>{strings('app_settings.rpc_desc')}</Text>}

						<Text style={styles.label}>{strings('app_settings.network_name_label')}</Text>
						<TextInput
							style={[styles.input, inputWidth]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={nickname}
							editable={editable}
							onChangeText={this.onNicknameChange}
							placeholder={strings('app_settings.network_name_placeholder')}
							placeholderTextColor={colors.grey100}
							onSubmitEditing={this.jumpToRpcURL}
							testID={'input-network-name'}
						/>

						<Text style={styles.label}>{strings('app_settings.network_rpc_url_label')}</Text>
						<TextInput
							ref={this.inputRpcURL}
							style={[styles.input, inputWidth]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={rpcUrl}
							editable={editable}
							onChangeText={this.onRpcUrlChange}
							onBlur={this.validateRpcUrl}
							placeholder={strings('app_settings.network_rpc_placeholder')}
							placeholderTextColor={colors.grey100}
							onSubmitEditing={this.jumpToChainId}
							testID={'input-rpc-url'}
						/>
						{warningRpcUrl && (
							<View style={styles.warningContainer} testID={'rpc-url-warning'}>
								<Text style={styles.warningText}>{warningRpcUrl}</Text>
							</View>
						)}

						<Text style={styles.label}>{strings('app_settings.network_chain_id_label')}</Text>
						<TextInput
							ref={this.inputChainId}
							style={[styles.input, inputWidth]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={chainId}
							editable={editable}
							onChangeText={this.onChainIDChange}
							onBlur={this.validateChainId}
							placeholder={strings('app_settings.network_chain_id_placeholder')}
							placeholderTextColor={colors.grey100}
							onSubmitEditing={this.jumpToSymbol}
							keyboardType={'numeric'}
						/>
						{warningChainId ? (
							<View style={styles.warningContainer}>
								<Text style={styles.warningText}>{warningChainId}</Text>
							</View>
						) : null}

						<Text style={styles.label}>{strings('app_settings.network_symbol_label')}</Text>
						<TextInput
							ref={this.inputSymbol}
							style={[styles.input, inputWidth]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={ticker}
							editable={editable}
							onChangeText={this.onTickerChange}
							placeholder={strings('app_settings.network_symbol_placeholder')}
							placeholderTextColor={colors.grey100}
							onSubmitEditing={this.jumpBlockExplorerURL}
							testID={'input-network-symbol'}
						/>

						<Text style={styles.label}>{strings('app_settings.network_block_explorer_label')}</Text>
						<TextInput
							ref={this.inputBlockExplorerURL}
							style={[styles.input, inputWidth]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={blockExplorerUrl}
							editable={editable}
							onChangeText={this.onBlockExplorerUrlChange}
							placeholder={strings('app_settings.network_block_explorer_placeholder')}
							placeholderTextColor={colors.grey100}
							onSubmitEditing={this.addRpcUrl}
						/>
					</View>
					{(addMode || editable) && (
						<View style={styles.buttonsWrapper}>
							<View style={styles.buttonsContainer}>
								<StyledButton
									type="confirm"
									onPress={this.addRpcUrl}
									testID={'network-add-button'}
									containerStyle={styles.syncConfirm}
									disabled={!enableAction || this.disabledByRpcUrl() || this.disabledByChainId()}
								>
									{editable
										? strings('app_settings.network_save')
										: strings('app_settings.network_add')}
								</StyledButton>
							</View>
						</View>
					)}
				</KeyboardAwareScrollView>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	frequentRpcList: state.engine.backgroundState.PreferencesController.frequentRpcList
});

export default connect(mapStateToProps)(NetworkSettings);
