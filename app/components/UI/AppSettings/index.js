import React, { Component } from 'react';
import {
	Platform,
	SafeAreaView,
	StyleSheet,
	Text,
	View,
	TextInput,
	ScrollView,
	Switch,
	TouchableOpacity
} from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import I18n, { strings, setLocale, getLanguages } from '../../../../locales/i18n';
import StyledButton from '../StyledButton';
import infuraCurrencies from '../../../util/infura-conversion.json';
import Engine from '../../../core/Engine';
import ActionModal from '../ActionModal';
import { isWebUri } from 'valid-url';
import SelectComponent from '../SelectComponent';
import { getNavigationOptionsTitle } from '../Navbar';
import { clearHistory } from '../../../actions/browser';
import { clearHosts, setPrivacyMode } from '../../../actions/privacy';
import { setSearchEngine, setShowHexData } from '../../../actions/settings';

const sortedCurrencies = infuraCurrencies.objects.sort((a, b) =>
	a.quote.name.toLocaleLowerCase().localeCompare(b.quote.name.toLocaleLowerCase())
);

const infuraCurrencyOptions = sortedCurrencies.map(({ quote: { code, name } }) => ({
	label: `${code.toUpperCase()} - ${name}`,
	key: code,
	value: code
}));

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapperContent: {
		paddingLeft: 20,
		paddingRight: 20,
		paddingVertical: 20
	},
	text: {
		fontSize: 18,
		textAlign: 'left',
		marginBottom: 5,
		...fontStyles.normal
	},
	subtext: {
		color: colors.fontSecondary,
		fontSize: 14,
		marginBottom: 8,
		marginTop: 5,
		textAlign: 'left',
		...fontStyles.normal
	},
	setting: {
		marginTop: Platform.OS === 'android' ? 20 : 22,
		marginBottom: Platform.OS === 'android' ? 20 : 22
	},
	input: {
		borderWidth: 2,
		borderRadius: 5,
		borderColor: colors.concrete,
		padding: 10
	},
	picker: {
		borderWidth: 2,
		borderRadius: 5,
		borderColor: colors.concrete
	},
	modalView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		flexDirection: 'column'
	},
	modalText: {
		fontSize: 18,
		textAlign: 'center',
		...fontStyles.normal
	},
	modalTitle: {
		fontSize: 22,
		textAlign: 'center',
		...fontStyles.bold
	},
	touchable: {
		flex: 1,
		alignSelf: 'flex-end'
	},
	touchableText: {
		fontSize: 18,
		padding: 5,
		...fontStyles.normal
	},
	warningText: {
		color: colors.error,
		...fontStyles.normal
	}
});

/**
 * View that contains app settings
 */
class AppSettings extends Component {
	static navigationOptions = () => getNavigationOptionsTitle(strings('app_settings.title'));

	state = {
		languages: {},
		currentLanguage: I18n.locale,
		modalVisible: false,
		approvalModalVisible: false,
		browserHistoryModalVisible: false,
		rpcUrl: '',
		warningRpcUrl: ''
	};

	static propTypes = {
		/**
		 * Map of hostnames with approved account access
		 */
		approvedHosts: PropTypes.object,
		/**
		 * Array of visited websites
		 */
		browserHistory: PropTypes.array,
		/**
		 * Called to clear all hostnames with account access
		 */
		clearHosts: PropTypes.func,
		/**
		 * Called to clear the list of visited urls
		 */
		clearBrowserHistory: PropTypes.func,
		/**
		/* State current currency
		*/
		currentCurrency: PropTypes.number,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Indicates whether privacy mode is enabled
		 */
		privacyMode: PropTypes.bool,
		/**
		 * Called to toggle privacy mode
		 */
		setPrivacyMode: PropTypes.func,
		/**
		 * Called to set the active search engine
		 */
		setSearchEngine: PropTypes.func,
		/**
		 * Active search engine
		 */
		searchEngine: PropTypes.string,
		/**
		 * Indicates whether hex data should be shown in transaction editor
		 */
		showHexData: PropTypes.bool,
		/**
		 * Called to toggle show hex data
		 */
		setShowHexData: PropTypes.func
	};

	componentDidMount = () => {
		const { currentCurrency } = this.props;
		const languages = getLanguages();
		this.setState({ languages, currentCurrency, currentLanguage: I18n.locale });
		this.languageOptions = Object.keys(languages).map(key => ({ value: key, label: languages[key], key }));
		this.searchEngineOptions = [
			{ value: 'DuckDuckGo', label: 'DuckDuckGo', key: 'DuckDuckGo' },
			{ value: 'Google', label: 'Google', key: 'Google' }
		];
	};

	static propTypes = {};

	selectLanguage = language => {
		const { navigation } = this.props;
		setLocale(language);
		this.setState({ currentLanguage: language });
		navigation.navigate('Entry');
	};

	selectSearchEngine = searchEngine => {
		this.props.setSearchEngine(searchEngine);
	};

	selectCurrency = async currency => {
		const { CurrencyRateController } = Engine.context;
		CurrencyRateController.configure({ currentCurrency: currency });
	};

	goToSyncWithExtension = () => {
		this.props.navigation.push('SyncWithExtensionView', { existingUser: true });
	};

	displayResetAccountModal = () => {
		this.setState({ modalVisible: true });
	};

	displayClearApprovalsModal = () => {
		this.setState({ approvalModalVisible: true });
	};

	displayClearBrowserHistoryModal = () => {
		this.setState({ browserHistoryModalVisible: true });
	};

	resetAccount = () => {
		const { TransactionController } = Engine.context;
		const { navigation } = this.props;
		TransactionController.wipeTransactions(true);
		navigation.navigate('Wallet');
	};

	clearApprovals = () => {
		this.props.clearHosts();
		this.cancelClearApprovals();
	};

	clearBrowserHistory = () => {
		this.props.clearBrowserHistory();
		this.cancelClearBrowserHistory();
	};

	cancelResetAccount = () => {
		this.setState({ modalVisible: false });
	};

	cancelClearApprovals = () => {
		this.setState({ approvalModalVisible: false });
	};

	cancelClearBrowserHistory = () => {
		this.setState({ browserHistoryModalVisible: false });
	};

	addRpcUrl = () => {
		const { PreferencesController, NetworkController } = Engine.context;
		const { rpcUrl } = this.state;
		const { navigation } = this.props;
		if (this.validateRpcUrl()) {
			PreferencesController.addToFrequentRpcList(rpcUrl);
			NetworkController.setRpcTarget(rpcUrl);
			navigation.navigate('Wallet');
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
		return true;
	};

	onRpcUrlChange = url => {
		this.setState({ rpcUrl: url });
	};

	togglePrivacy = value => {
		this.props.setPrivacyMode(value);
	};

	toggleShowHexData = showHexData => {
		this.props.setShowHexData(showHexData);
	};

	render = () => {
		const { modalVisible, approvalModalVisible, browserHistoryModalVisible } = this.state;
		const { approvedHosts, browserHistory, currentCurrency, privacyMode, showHexData } = this.props;
		return (
			<SafeAreaView style={styles.wrapper} testID={'app-settings-screen'}>
				<ScrollView contentContainerStyle={styles.wrapperContent}>
					<ActionModal
						modalVisible={modalVisible}
						confirmText={strings('app_settings.reset_account_confirm_button')}
						cancelText={strings('app_settings.reset_account_cancel_button')}
						onCancelPress={this.cancelResetAccount}
						onRequestClose={this.cancelResetAccount}
						onConfirmPress={this.resetAccount}
					>
						<View style={styles.modalView}>
							<Text style={styles.modalTitle}>{strings('app_settings.reset_account_modal_title')}</Text>
							<Text style={styles.modalText}>{strings('app_settings.reset_account_modal_message')}</Text>
						</View>
					</ActionModal>
					<ActionModal
						modalVisible={approvalModalVisible}
						confirmText={strings('app_settings.clear')}
						cancelText={strings('app_settings.reset_account_cancel_button')}
						onCancelPress={this.cancelClearApprovals}
						onRequestClose={this.cancelClearApprovals}
						onConfirmPress={this.clearApprovals}
					>
						<View style={styles.modalView}>
							<Text style={styles.modalTitle}>{strings('app_settings.clear_approvals_modal_title')}</Text>
							<Text style={styles.modalText}>
								{strings('app_settings.clear_approvals_modal_message')}
							</Text>
						</View>
					</ActionModal>
					<ActionModal
						modalVisible={browserHistoryModalVisible}
						confirmText={strings('app_settings.clear')}
						cancelText={strings('app_settings.reset_account_cancel_button')}
						onCancelPress={this.cancelClearBrowserHistory}
						onRequestClose={this.cancelClearBrowserHistory}
						onConfirmPress={this.clearBrowserHistory}
					>
						<View style={styles.modalView}>
							<Text style={styles.modalTitle}>
								{strings('app_settings.clear_browser_history_modal_title')}
							</Text>
							<Text style={styles.modalText}>
								{strings('app_settings.clear_browser_history_modal_message')}
							</Text>
						</View>
					</ActionModal>

					<View style={styles.setting}>
						<Text style={styles.text}>{strings('app_settings.current_conversion')}</Text>
						<View style={styles.picker}>
							<SelectComponent
								selectedValue={currentCurrency}
								onValueChange={this.selectCurrency}
								label={strings('app_settings.current_conversion')}
								options={infuraCurrencyOptions}
							/>
						</View>
					</View>
					<View style={styles.setting}>
						<Text style={styles.text}>{strings('app_settings.current_language')}</Text>
						<View style={styles.picker}>
							{this.languageOptions && (
								<SelectComponent
									selectedValue={this.state.currentLanguage}
									onValueChange={this.selectLanguage}
									label={strings('app_settings.current_language')}
									options={this.languageOptions}
								/>
							)}
						</View>
					</View>
					<View style={styles.setting}>
						<Text style={styles.text}>{strings('app_settings.search_engine')}</Text>
						<View style={styles.picker}>
							{this.searchEngineOptions && (
								<SelectComponent
									selectedValue={this.props.searchEngine}
									onValueChange={this.selectSearchEngine}
									label={strings('app_settings.search_engine')}
									options={this.searchEngineOptions}
								/>
							)}
						</View>
					</View>
					<View style={styles.setting}>
						<Text style={styles.text}>{strings('app_settings.new_RPC_URL')}</Text>
						<TextInput
							style={styles.input}
							value={this.state.rpcUrl}
							onSubmitEditing={this.addRpcUrl}
							onChangeText={this.onRpcUrlChange}
						/>
						<Text style={styles.warningText}>{this.state.warningRpcUrl}</Text>
						<TouchableOpacity key="save" onPress={this.addRpcUrl} style={styles.touchable}>
							<Text style={styles.touchableText}>{strings('app_settings.save_rpc_url')}</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.setting}>
						<Text style={styles.text}>{strings('app_settings.privacy_mode')}</Text>
						<View>
							<Text style={styles.subtext}>{strings('app_settings.privacy_mode_desc')}</Text>
							<Switch
								value={privacyMode}
								onValueChange={this.togglePrivacy}
								trackColor={
									Platform.OS === 'ios' ? { true: colors.primary, false: colors.concrete } : null
								}
								ios_backgroundColor={colors.slate}
							/>
						</View>
					</View>
					<View style={styles.setting}>
						<Text style={styles.text}>{strings('app_settings.show_hex_data')}</Text>
						<View>
							<Text style={styles.subtext}>{strings('app_settings.show_hex_data_desc')}</Text>
							<Switch
								value={showHexData}
								onValueChange={this.toggleShowHexData}
								trackColor={
									Platform.OS === 'ios' ? { true: colors.primary, false: colors.concrete } : null
								}
								ios_backgroundColor={colors.slate}
							/>
						</View>
					</View>
					<View style={styles.setting}>
						<Text style={styles.text}>{strings('app_settings.clear_approve_dapps_desc')}</Text>
						<StyledButton
							type="confirm"
							onPress={this.displayClearApprovalsModal}
							disabled={Object.keys(approvedHosts).length === 0}
						>
							{strings('app_settings.clear_approved_dapps')}
						</StyledButton>
					</View>
					<View style={styles.setting}>
						<Text style={styles.text}>{strings('app_settings.clear_browser_history_desc')}</Text>
						<StyledButton
							type="confirm"
							onPress={this.displayClearBrowserHistoryModal}
							disabled={browserHistory.length === 0}
						>
							{strings('app_settings.clear_browser_history')}
						</StyledButton>
					</View>
					<View style={styles.setting}>
						<Text style={styles.text}>{strings('app_settings.sync_with_extension')}</Text>
						<StyledButton type="confirm" onPress={this.goToSyncWithExtension}>
							{strings('app_settings.sync')}
						</StyledButton>
					</View>
					<View style={styles.setting}>
						<Text style={styles.text}>{strings('app_settings.reset_account')}</Text>
						<StyledButton type="orange" onPress={this.displayResetAccountModal}>
							{strings('app_settings.reset_account_button')}
						</StyledButton>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	approvedHosts: state.privacy.approvedHosts,
	browserHistory: state.browser.history,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	privacyMode: state.privacy.privacyMode,
	searchEngine: state.settings.searchEngine,
	showHexData: state.settings.showHexData
});

const mapDispatchToProps = dispatch => ({
	clearHosts: () => dispatch(clearHosts()),
	clearBrowserHistory: () => dispatch(clearHistory()),
	setPrivacyMode: enabled => dispatch(setPrivacyMode(enabled)),
	setSearchEngine: searchEngine => dispatch(setSearchEngine(searchEngine)),
	setShowHexData: showHexData => dispatch(setShowHexData(showHexData))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(AppSettings);
