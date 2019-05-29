import React, { Component } from 'react';
// eslint-disable-next-line import/no-commonjs
import Icon from 'react-native-vector-icons/FontAwesome';
import PaymentChannelsClient from '../../../core/PaymentChannelsClient';
import {
	InteractionManager,
	Platform,
	ScrollView,
	TextInput,
	Alert,
	Text,
	View,
	SafeAreaView,
	StyleSheet,
	ActivityIndicator,
	TouchableOpacity,
	Dimensions,
	Clipboard
} from 'react-native';
import PropTypes from 'prop-types';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import QRCode from 'react-native-qrcode-svg';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';

import { connect } from 'react-redux';
import { showAlert } from '../../../actions/alert';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';
import AppConstants from '../../../core/AppConstants';
import { renderFromWei } from '../../../util/number';

const QR_PADDING = 160;

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollviewWrapper: {
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingBottom: 0
	},
	balance: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	balanceText: {
		justifyContent: 'center',
		alignItems: 'center',
		flex: 1,
		marginTop: 10,
		fontSize: 70,
		...fontStyles.normal
	},
	info: {
		flex: 1,
		paddingVertical: 15,
		paddingRight: 20
	},
	data: {
		marginTop: 10,
		height: 120
	},
	buttonWrapper: {
		paddingVertical: 20,
		alignItems: 'flex-end',
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between'
	},
	noPaddingTop: {
		paddingTop: 0
	},
	button: {
		flex: 0,
		paddingVertical: 5,
		width: 160,
		height: 30
	},
	fullButton: {
		flex: 1,
		marginBottom: 20,
		height: 30
	},
	buttonText: {
		fontSize: 14
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 120,
		justifyContent: 'center',
		alignItems: 'center'
	},
	input: {
		width: 160,
		height: 50,
		borderWidth: 1,
		borderColor: colors.grey200,
		paddingHorizontal: 10
	},
	fullWidthInput: {
		flex: 1,
		height: 50,
		borderWidth: 1,
		borderColor: colors.grey200,
		paddingHorizontal: 10,
		paddingRight: 50,
		marginTop: 10
	},
	sectionTitleText: {
		fontSize: 20,
		...fontStyles.bold
	},
	sectionTitleWrapper: {
		marginBottom: 15
	},
	panel: {
		flex: 1
	},
	panelContent: {
		paddingVertical: 20,
		paddingHorizontal: 20
	},
	accountWrapper: {
		flexDirection: 'row'
	},
	qrCodeButton: {
		position: 'absolute',
		right: 5,
		top: 10,
		minHeight: 50,
		paddingRight: 8,
		paddingLeft: 12,
		flexDirection: 'row',
		alignItems: 'center'
	},
	qrCodeWrapper: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 0,
		padding: 15
	},
	addressWrapper: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
		paddingVertical: 15,
		marginTop: 10,
		borderRadius: 5,
		backgroundColor: colors.grey000
	},
	address: {
		...fontStyles.normal,
		fontSize: Platform.OS === 'ios' ? 14 : 20,
		textAlign: 'center'
	},
	explainerText: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 16,
		marginBottom: 15
	},
	explainerTextWrapper: {
		marginBottom: 20
	},
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.blue
	},
	tabStyle: {
		paddingBottom: 0
	},
	tabTextStyle: {
		fontSize: 12,
		letterSpacing: 0.5,
		...fontStyles.bold
	},
	bold: {
		...fontStyles.bold
	}
});

/**
/* View that contains all the UI to
/* deposit, send, receive and withdraw
/* instant payments
*/
class PaymentChannel extends Component {
	static navigationOptions = ({ navigation }) => getNavigationOptionsTitle(`Instant Payments`, navigation);

	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		/* Triggers global alert
		*/
		showAlert: PropTypes.func,
		/**
		/* List of all available accounts
		*/
		accounts: PropTypes.object
	};

	state = {
		balance: '0.00',
		status: { type: null },
		qrModalVisible: false,
		sendAmount: '',
		sendRecipient: '',
		depositAmount: ''
	};

	client = null;
	sending = false;
	depositing = false;
	withdrawing = false;

	onStateChange = state => {
		this.setState({
			balance: state.balance,
			status: state.status
		});
	};

	componentDidMount = async () => {
		InteractionManager.runAfterInteractions(() => {
			const state = PaymentChannelsClient.getState();
			this.setState({
				balance: state.balance,
				status: state.status,
				ready: true
			});
		});

		PaymentChannelsClient.hub.on('state::change', this.onStateChange);

		this.mounted = true;
	};

	componentWillUnmount() {
		PaymentChannelsClient.hub.removeListener('state::change', this.onStateChange);
	}

	deposit = async () => {
		if (this.depositing) {
			return;
		}
		try {
			const params = {
				depositAmount: this.state.depositAmount
			};

			if (isNaN(params.depositAmount) || params.depositAmount.trim() === '') {
				Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.invalid_amount'));
				return false;
			}

			const depositAmountNumber = parseFloat(params.depositAmount);
			const { MAX_DEPOSIT_TOKEN, getExchangeRate } = PaymentChannelsClient;

			const ETH = parseFloat(getExchangeRate());
			const maxDepositAmount = (MAX_DEPOSIT_TOKEN / ETH).toFixed(2);
			const minDepositAmount = AppConstants.CONNEXT.MIN_DEPOSIT_ETH;

			if (depositAmountNumber > maxDepositAmount) {
				Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.amount_too_high'));
				return false;
			}

			if (params.depositAmount < minDepositAmount) {
				Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.amount_too_low'));
				return false;
			}

			const accountBalance = renderFromWei(this.props.accounts[this.props.selectedAddress].balance);
			if (parseFloat(accountBalance) <= parseFloat(params.depositAmount)) {
				Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.insufficient_funds'));
				return false;
			}

			Logger.log('About to deposit', params);
			this.depositing = true;
			await PaymentChannelsClient.deposit(params);
			this.setState({ depositAmount: '' });
			this.depositing = false;
			Logger.log('Deposit succesful');
		} catch (e) {
			if (e.message === 'still_blocked') {
				Alert.alert(strings('paymentChannels.not_ready'), strings('paymentChannels.please_wait'));
			} else {
				Alert.alert(strings('paymentChannels.heads_up'), strings('paymentChannels.security_reasons'));
				Logger.log('Deposit error', e);
			}
			this.depositing = false;
		}
	};

	send = async () => {
		if (this.sending) {
			return;
		}

		try {
			const params = {
				sendRecipient: this.state.sendRecipient,
				sendAmount: this.state.sendAmount
			};

			if (isNaN(params.sendAmount) || params.sendAmount.trim() === '') {
				Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.enter_the_amount'));
				return false;
			}

			if (!params.sendRecipient) {
				Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.enter_the_recipient'));
			}

			Logger.log('Sending ', params);
			this.sending = true;
			await PaymentChannelsClient.send(params);
			this.sending = false;

			Logger.log('Send succesful');
		} catch (e) {
			let msg = strings('paymentChannels.unknown_error');
			if (e.message === 'insufficient_balance') {
				msg = strings('paymentChannels.insufficient_balance');
			}
			Alert.alert(strings('paymentChannels.error'), msg);
			Logger.log('buy error error', e);
			this.sending = false;
		}
	};

	withdraw = async () => {
		if (this.withdrawing) {
			return;
		}
		try {
			this.withdrawing = true;
			await PaymentChannelsClient.withdrawAll();
			this.withdrawing = false;
			Logger.log('withdraw succesful');
		} catch (e) {
			this.withdrawing = false;
			Logger.log('withdraw error', e);
		}
	};

	renderInfo() {
		return (
			<View style={styles.info}>
				<View style={styles.balance}>
					<Text style={styles.balanceText}>$ {this.state.balance}</Text>
				</View>
			</View>
		);
	}

	scan = () => {
		this.props.navigation.navigate('QRScanner', {
			onScanSuccess: meta => {
				if (meta.target_address) {
					this.setState({ sendRecipient: meta.target_address });
				}
			}
		});
	};

	closeQrModal = () => {
		this.setState({ qrModalVisible: false });
	};

	openQrModal = () => {
		this.setState({ qrModalVisible: true });
	};

	areButtonsDisabled = () => {
		const { status } = this.state;
		if (status && status.type) {
			return status.type.indexOf('_PENDING') !== -1;
		}
		return false;
	};

	renderMinimumsOrSpinner() {
		const minFiat = PaymentChannelsClient.getMinimumDepositFiat();
		const maxFiat = PaymentChannelsClient.MAX_DEPOSIT_TOKEN.toFixed(2).toString();
		const maxETH = PaymentChannelsClient.getMaximumDepositEth();
		return (
			<React.Fragment>
				<Text style={styles.explainerText}>
					{`${strings('paymentChannels.min_deposit')}`}
					<Text style={styles.bold}>
						{PaymentChannelsClient.MIN_DEPOSIT_ETH} ETH (${minFiat})
					</Text>
				</Text>
				<Text style={styles.explainerText}>
					{`${strings('paymentChannels.max_deposit')}`}
					<Text style={styles.bold}>
						{maxETH} ETH (${maxFiat})
					</Text>
				</Text>
			</React.Fragment>
		);
	}

	renderDeposit() {
		const isDisabled = this.areButtonsDisabled();
		return (
			<React.Fragment>
				<View style={styles.explainerTextWrapper}>
					<Text style={styles.explainerText}>
						{strings('paymentChannels.in_order_to_use')}
						<Text style={styles.bold}>{strings('paymentChannels.you_need_to_deposit')}</Text>
					</Text>
					{this.renderMinimumsOrSpinner()}
				</View>

				<View style={styles.sectionTitleWrapper}>
					<Text style={styles.sectionTitleText}>{strings('paymentChannels.deposit_eth')}</Text>
				</View>
				<View style={[styles.buttonWrapper, styles.noPaddingTop]}>
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						// eslint-disable-next-line react/jsx-no-bind
						onChangeText={val => this.setState({ depositAmount: val })}
						placeholder={strings('paymentChannels.enter_eth_amount')}
						spellCheck={false}
						style={styles.input}
						value={this.state.depositAmount}
						onBlur={this.onBlur}
						keyboardType="numeric"
						numberOfLines={1}
					/>
					<StyledButton
						containerStyle={styles.button}
						style={styles.buttonText}
						type={'confirm'}
						onPress={this.deposit}
						testID={'submit-button'}
						disabled={isDisabled}
					>
						{strings('paymentChannels.deposit')}
					</StyledButton>
				</View>
			</React.Fragment>
		);
	}

	renderSend() {
		const isDisabled = this.areButtonsDisabled();
		return (
			<React.Fragment>
				<View style={styles.explainerTextWrapper}>
					<Text style={styles.explainerText}>{strings('paymentChannels.send_intro')}</Text>
				</View>
				<View style={styles.sectionTitleWrapper}>
					<Text style={styles.sectionTitleText}>{strings('paymentChannels.send_payment')}</Text>
				</View>
				<View style={styles.accountWrapper}>
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						// eslint-disable-next-line react/jsx-no-bind
						onChangeText={val => this.setState({ sendRecipient: val })}
						placeholder={strings('paymentChannels.enter_recipient')}
						spellCheck={false}
						style={styles.fullWidthInput}
						value={this.state.sendRecipient}
						onBlur={this.onBlur}
					/>
					<TouchableOpacity onPress={this.scan} style={styles.qrCodeButton}>
						<Icon name="qrcode" size={Platform.OS === 'android' ? 28 : 28} />
					</TouchableOpacity>
				</View>
				<View style={styles.buttonWrapper}>
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						// eslint-disable-next-line react/jsx-no-bind
						onChangeText={val => this.setState({ sendAmount: val })}
						placeholder={strings('paymentChannels.enter_amount')}
						spellCheck={false}
						style={styles.input}
						value={this.state.sendAmount}
						onBlur={this.onBlur}
						keyboardType="numeric"
						numberOfLines={1}
					/>

					<StyledButton
						containerStyle={styles.button}
						style={styles.buttonText}
						type={'confirm'}
						onPress={this.send}
						testID={'submit-button'}
						disabled={isDisabled}
					>
						{strings('paymentChannels.send')}
					</StyledButton>
				</View>
			</React.Fragment>
		);
	}

	renderReceive() {
		return (
			<React.Fragment>
				<View style={styles.explainerTextWrapper}>
					<Text style={styles.explainerText}>{strings('paymentChannels.receive_intro')}</Text>
				</View>
				<View style={styles.qrCodeWrapper}>
					<QRCode
						value={`ethereum:${this.props.selectedAddress}`}
						size={Dimensions.get('window').width - QR_PADDING}
					/>
				</View>
				<TouchableOpacity style={styles.addressWrapper} onPress={this.copyAccountToClipboard}>
					<Text style={styles.address}>{this.props.selectedAddress}</Text>
				</TouchableOpacity>
			</React.Fragment>
		);
	}

	renderWithdraw() {
		const isDisabled = this.areButtonsDisabled();
		return (
			<React.Fragment>
				<View style={styles.explainerTextWrapper}>
					<Text style={styles.explainerText}>{strings('paymentChannels.withdraw_intro')}</Text>
					<Text style={styles.explainerText}>{strings('paymentChannels.withdraw_info')}</Text>
					<Text style={styles.explainerText}>{strings('paymentChannels.withdraw_note')}</Text>
				</View>
				<View style={[styles.buttonWrapper, styles.noPaddingTop]}>
					<StyledButton
						containerStyle={styles.fullButton}
						style={styles.buttonText}
						type={'confirm'}
						onPress={this.withdraw}
						testID={'submit-button'}
						disabled={isDisabled}
					>
						{strings('paymentChannels.withdraw')}
					</StyledButton>
				</View>
			</React.Fragment>
		);
	}

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.blue}
				inactiveTextColor={colors.fontTertiary}
				backgroundColor={colors.white}
				tabStyle={styles.tabStyle}
				textStyle={styles.tabTextStyle}
			/>
		);
	}

	copyAccountToClipboard = async () => {
		const { selectedAddress } = this.props;
		await Clipboard.setString(selectedAddress);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') }
		});
	};

	renderContent() {
		if (!this.state.ready) {
			return (
				<View style={styles.loader}>
					<ActivityIndicator size="small" />
				</View>
			);
		}

		return (
			<React.Fragment>
				<View style={styles.data}>{this.renderInfo()}</View>
				<View style={styles.panel}>
					<ScrollableTabView renderTabBar={this.renderTabBar}>
						<ScrollView tabLabel={strings('paymentChannels.deposit')}>
							<View style={styles.panelContent}>{this.renderDeposit()}</View>
						</ScrollView>
						<ScrollView tabLabel={strings('paymentChannels.send')}>
							<View style={styles.panelContent}>{this.renderSend()}</View>
						</ScrollView>
						<ScrollView tabLabel={strings('paymentChannels.receive')}>
							<View style={styles.panelContent}>{this.renderReceive()}</View>
						</ScrollView>
						<ScrollView tabLabel={strings('paymentChannels.withdraw')}>
							<View style={styles.panelContent}>{this.renderWithdraw()}</View>
						</ScrollView>
					</ScrollableTabView>
				</View>
			</React.Fragment>
		);
	}

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView
					contentContainerStyle={styles.scrollviewWrapper}
					style={styles.mainWrapper}
					testID={'payment-channels-screen'}
				>
					<View style={styles.wrapper}>{this.renderContent()}</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	accounts: state.engine.backgroundState.AccountTrackerController.accounts
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(PaymentChannel);
