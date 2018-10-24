import React, { Component } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Picker, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import I18n, { strings, setLocale, getLanguages } from '../../../locales/i18n';
import StyledButton from '../StyledButton';
import infuraCurrencies from '../../util/infura-conversion.json';
import Engine from '../../core/Engine';
import ActionModal from '../ActionModal';
import { isWebUri } from 'valid-url';

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
		flex: 1,
		paddingLeft: 20,
		paddingRight: 20
	},
	text: {
		fontSize: 18,
		textAlign: 'left',
		marginBottom: 5,
		...fontStyles.normal
	},
	setting: {
		marginTop: 10,
		marginBottom: 10
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
	static navigationOptions = () => ({
		title: strings('app_settings.title'),
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	});

	state = {
		languages: {},
		currentLanguage: I18n.locale,
		currentCurrency: 'usd',
		modalVisible: false,
		rpcUrl: '',
		warningRpcUrl: ''
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		/* State current currency
		*/
		currentCurrency: PropTypes.number
	};

	componentDidMount = () => {
		const { currentCurrency } = this.props;
		this.setState({ languages: getLanguages(), currentCurrency });
	};

	static propTypes = {};

	selectLanguage = language => {
		const { navigation } = this.props;
		setLocale(language);
		this.setState({ currentLanguage: language });
		navigation.navigate('Entry');
	};

	selectCurrency = async currency => {
		const { CurrencyRateController } = Engine.context;
		await CurrencyRateController.updateCurrency(currency);
		this.setState({ currentCurrency: currency });
	};

	goToRevealPrivateCredential = () => {
		this.props.navigation.navigate('RevealPrivateCredential', { privateCredentialName: 'seed_phrase' });
	};

	displayResetAccountModal = () => {
		this.setState({ modalVisible: true });
	};

	resetAccount = () => {
		const { TransactionController } = Engine.context;
		const { navigation } = this.props;
		TransactionController.wipeTransactions(true);
		navigation.navigate('Wallet');
	};

	cancelResetAccount = () => {
		this.setState({ modalVisible: false });
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

	render() {
		return (
			<ScrollView style={styles.wrapper} testID={'app-settings-screen'}>
				<ActionModal
					modalVisible={this.state.modalVisible}
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

				<View style={styles.setting}>
					<Text style={styles.text}>{strings('app_settings.current_conversion')}</Text>
					<View style={styles.picker}>
						<Picker selectedValue={this.state.currentCurrency} onValueChange={this.selectCurrency}>
							{infuraCurrencyOptions.map(option => (
								<Picker.Item value={option.value} label={option.label} key={option.key} />
							))}
						</Picker>
					</View>
				</View>
				<View style={styles.setting}>
					<Text style={styles.text}>{strings('app_settings.current_language')}</Text>
					<View style={styles.picker}>
						<Picker selectedValue={this.state.currentLanguage} onValueChange={this.selectLanguage}>
							{Object.keys(this.state.languages).map(key => (
								<Picker.Item value={key} label={this.state.languages[key]} key={key} />
							))}
						</Picker>
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
					<Text style={styles.text}>{strings('app_settings.reveal_seed_words')}</Text>
					<StyledButton type="warning" onPress={this.goToRevealPrivateCredential}>
						{strings('app_settings.reveal_seed_words_button')}
					</StyledButton>
				</View>
				<View style={styles.setting}>
					<Text style={styles.text}>{strings('app_settings.reset_account')}</Text>
					<StyledButton type="orange" onPress={this.displayResetAccountModal}>
						{strings('app_settings.reset_account_button')}
					</StyledButton>
				</View>
			</ScrollView>
		);
	}
}

const mapStateToProps = state => ({
	currentCurrency: state.backgroundState.CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(AppSettings);
