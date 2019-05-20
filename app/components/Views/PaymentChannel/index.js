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
		showAlert: PropTypes.func
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

	componentDidMount = async () => {
		InteractionManager.runAfterInteractions(() => {
			const state = PaymentChannelsClient.getState();
			this.setState({
				balance: state.balance,
				status: state.status,
				ready: true
			});
		});

		PaymentChannelsClient.hub.on('state::change', state => {
			Logger.log('GOT STATE UPDATE', state);
			this.setState({
				balance: state.balance,
				status: state.status
			});
		});

		this.mounted = true;
	};

	componentWillUnmount() {
		PaymentChannelsClient.hub.removeAllListeners();
		this.mounted && PaymentChannelsClient.stop();
	}

	deposit = async () => {
		try {
			const params = {
				depositAmount: this.state.depositAmount
			};
			Logger.log('About to deposit', params);
			await PaymentChannelsClient.deposit(params);
			this.setState({ depositAmount: '' });
			Logger.log('Deposit succesful');
		} catch (e) {
			Alert.alert('Error', e.message);
			Logger.log('Deposit error', e);
		}
	};

	send = async () => {
		try {
			const params = {
				sendRecipient: this.state.sendRecipient,
				sendAmount: this.state.sendAmount
			};
			Logger.log('Sending ', params);
			await PaymentChannelsClient.send(params);

			Logger.log('Send succesful');
		} catch (e) {
			Alert.alert('Error', e.message);
			Logger.log('buy error error', e);
		}
	};

	withdraw = async () => {
		try {
			await PaymentChannelsClient.withdrawAll();
			Logger.log('withdraw succesful');
		} catch (e) {
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

	/**
	 * Closes QR code modal
	 */
	closeQrModal = () => {
		this.setState({ qrModalVisible: false });
	};

	/**
	 * Opens QR code modal
	 */
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
					Min. deposit:{' '}
					<Text style={styles.bold}>
						{PaymentChannelsClient.MIN_DEPOSIT_ETH} ETH (${minFiat})
					</Text>
				</Text>
				<Text style={styles.explainerText}>
					Max. deposit:{' '}
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
						In order to start sending instant payments,{' '}
						<Text style={styles.bold}>you first need to deposit some ETH</Text>
					</Text>
					{this.renderMinimumsOrSpinner()}
				</View>

				<View style={styles.sectionTitleWrapper}>
					<Text style={styles.sectionTitleText}>DEPOSIT ETH</Text>
				</View>
				<View style={[styles.buttonWrapper, styles.noPaddingTop]}>
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						// eslint-disable-next-line react/jsx-no-bind
						onChangeText={val => this.setState({ depositAmount: val })}
						placeholder={`Enter ETH amount`}
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
						DEPOSIT
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
					<Text style={styles.explainerText}>
						Send instant payments completely free to any other Ethereum address!
					</Text>
				</View>
				<View style={styles.sectionTitleWrapper}>
					<Text style={styles.sectionTitleText}>SEND PAYMENT</Text>
				</View>
				<View style={styles.accountWrapper}>
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						// eslint-disable-next-line react/jsx-no-bind
						onChangeText={val => this.setState({ sendRecipient: val })}
						placeholder={`Enter recipient: 0x...`}
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
						placeholder={`Enter Amount`}
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
						SEND
					</StyledButton>
				</View>
			</React.Fragment>
		);
	}

	renderReceive() {
		return (
			<React.Fragment>
				<View style={styles.explainerTextWrapper}>
					<Text style={styles.explainerText}>
						Receive payments by sharing your address or showing your QR code
					</Text>
				</View>
				<View style={styles.qrCodeWrapper}>
					<QRCode
						value={`ethereum:${this.props.selectedAddress}`}
						size={Dimensions.get('window').width - 160}
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
					<Text style={styles.explainerText}>Your funds will be sent to your normal Ethereum account</Text>
					<Text
						style={styles.explainerText}
					>{`This process will take a few seconds because it's a normal ETH transaction`}</Text>
					<Text style={styles.explainerText}>NOTE: The transaction fees will be paid with your funds</Text>
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
						WITHDRAW
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
						<ScrollView tabLabel={'DEPOSIT'}>
							<View style={styles.panelContent}>{this.renderDeposit()}</View>
						</ScrollView>
						<ScrollView tabLabel={'SEND'}>
							<View style={styles.panelContent}>{this.renderSend()}</View>
						</ScrollView>
						<ScrollView tabLabel={'RECEIVE'}>
							<View style={styles.panelContent}>{this.renderReceive()}</View>
						</ScrollView>
						<ScrollView tabLabel={'WITHDRAW'}>
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
					testID={'account-backup-step-1-screen'}
				>
					<View style={styles.wrapper} testID={'test'}>
						{this.renderContent()}
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(PaymentChannel);
