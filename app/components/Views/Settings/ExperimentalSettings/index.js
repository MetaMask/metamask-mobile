import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Alert, Switch, StyleSheet, Text, ScrollView, View, InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import StyledButton from '../../../UI/StyledButton';
import { setEnablePaymentChannels } from '../../../../actions/settings';
import { colors, fontStyles } from '../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import AppConstants from '../../../../core/AppConstants';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import Device from '../../../../util/Device';
import Analytics from '../../../../core/Analytics';
import PaymentChannelsClient from '../../../../core/PaymentChannelsClient';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 24,
		paddingBottom: 48
	},
	title: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 20,
		lineHeight: 20
	},
	desc: {
		...fontStyles.normal,
		color: colors.grey500,
		fontSize: 14,
		lineHeight: 20,
		marginTop: 12
	},
	setting: {
		marginVertical: 18
	},
	clearHistoryConfirm: {
		marginTop: 18
	},
	switchElement: {
		marginVertical: 20
	}
});

/**
 * Main view for app Experimental Settings
 */
class ExperimentalSettings extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		/* Func that enables / disables payment channels
		*/
		setEnablePaymentChannels: PropTypes.func,
		/**
		 * Selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		/* Flag that determines the state of payment channels
		*/
		paymentChannelsEnabled: PropTypes.bool
	};

	state = {
		paymentChannelHasBalance: false
	};

	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(strings('app_settings.experimental_title'), navigation);

	componentDidMount = async () => {
		const paymentChannelHasBalance = await PaymentChannelsClient.addressHasTransactions(this.props.selectedAddress);
		this.setState({ paymentChannelHasBalance });
	};

	goToWalletConnectSessions = () => {
		this.props.navigation.navigate('WalletConnectSessionsView');
	};

	goToPaymentChannels = () => {
		const { provider } = Engine.context.NetworkController.state;
		if (AppConstants.CONNEXT.SUPPORTED_NETWORKS.indexOf(provider.type) !== -1) {
			this.props.navigation.navigate('PaymentChannelHome');
		} else {
			Alert.alert(
				strings('experimental_settings.network_not_supported'),
				strings('experimental_settings.switch_network')
			);
		}
	};

	togglePaymentChannels = enabled => {
		this.props.setEnablePaymentChannels(enabled);
		InteractionManager.runAfterInteractions(() => {
			setTimeout(() => {
				if (enabled) {
					Analytics.trackEvent(ANALYTICS_EVENT_OPTS.PAYMENT_CHANNELS_ENABLED);
				} else {
					Analytics.trackEvent(ANALYTICS_EVENT_OPTS.PAYMENT_CHANNELS_DISABLED);
				}
			}, 1000);
		});
	};

	render = () => {
		const { paymentChannelsEnabled } = this.props;
		const { paymentChannelHasBalance } = this.state;

		return (
			<ScrollView style={styles.wrapper}>
				<View style={styles.setting}>
					<View>
						<Text style={styles.title}>{strings('experimental_settings.wallet_connect_dapps')}</Text>
						<Text style={styles.desc}>{strings('experimental_settings.wallet_connect_dapps_desc')}</Text>
						<StyledButton
							type="normal"
							onPress={this.goToWalletConnectSessions}
							containerStyle={styles.clearHistoryConfirm}
						>
							{strings('experimental_settings.wallet_connect_dapps_cta')}
						</StyledButton>
					</View>
				</View>
				{paymentChannelHasBalance && (
					<View style={styles.setting}>
						<Text style={styles.title}>{strings('experimental_settings.payment_channels')}</Text>
						<Text style={styles.desc}>{strings('experimental_settings.enable_payment_channels_desc')}</Text>
						<View style={styles.switchElement}>
							<Switch
								value={paymentChannelsEnabled}
								onValueChange={this.togglePaymentChannels}
								trackColor={Device.isIos() ? { true: colors.blue, false: colors.grey000 } : null}
								ios_backgroundColor={colors.grey000}
							/>
						</View>
						<Text style={styles.desc}>{strings('experimental_settings.payment_channels_desc')}</Text>
						<StyledButton
							type="normal"
							onPress={this.goToPaymentChannels}
							containerStyle={styles.clearHistoryConfirm}
							disabled={!paymentChannelsEnabled}
						>
							{strings('experimental_settings.payment_channels_cta')}
						</StyledButton>
					</View>
				)}
			</ScrollView>
		);
	};
}

const mapStateToProps = state => ({
	paymentChannelsEnabled: state.settings.paymentChannelsEnabled,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

const mapDispatchToProps = dispatch => ({
	setEnablePaymentChannels: enable => dispatch(setEnablePaymentChannels(enable))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ExperimentalSettings);
