import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Clipboard, Alert, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Identicon from '../Identicon';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FoundationIcon from 'react-native-vector-icons/Foundation';
import { strings } from '../../../locales/i18n';
import Engine from '../../core/Engine';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		height: 210,
		paddingTop: 20,
		paddingHorizontal: 20,
		paddingBottom: 0,
		alignItems: 'center'
	},
	info: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	label: {
		paddingTop: 7,
		fontSize: 24,
		...fontStyles.normal
	},
	amountFiat: {
		fontSize: 12,
		paddingTop: 5,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	actions: {
		flexDirection: 'row',
		marginTop: 20,
		maxWidth: 220,
		alignContent: 'center',
		justifyContent: 'center',
		alignItems: 'center'
	},
	button: {
		flex: 1,
		justifyContent: 'center',
		alignContent: 'center',
		alignItems: 'center'
	},
	buttonIconWrapper: {
		width: 36,
		height: 36,
		paddingTop: 10,
		paddingLeft: 7,
		justifyContent: 'center',
		alignContent: 'center',
		color: colors.white,
		borderRadius: 18,
		backgroundColor: colors.primary
	},
	buttonIcon: {
		width: 24,
		height: 24,
		justifyContent: 'center',
		alignContent: 'center',
		textAlign: 'center',
		color: colors.white
	},
	buttonText: {
		marginTop: 5,
		textAlign: 'center',
		color: colors.primary,
		fontSize: 11,
		...fontStyles.normal
	},
	sendIcon: {
		paddingTop: 0,
		paddingLeft: 0
	},
	depositIcon: {
		marginTop: -5,
		marginLeft: -0.5
	},
	copyIcon: {
		marginLeft: -1
	}
});

/**
 * View that's part of the <Wallet /> component
 * which shows information about the selected account
 */
export default class AccountOverview extends Component {
	static propTypes = {
		/**
		 * Object that represents the selected account
		 */
		account: PropTypes.object,
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Action that shows the global alert
		 */
		showAlert: PropTypes.func.isRequired
	};
	onDeposit = () => {
		Alert.alert(strings('drawer.coming_soon'));
	};
	onSend = () => {
		this.props.navigation.navigate('SendView');
	};
	onCopy = async () => {
		const {
			account: { address }
		} = this.props;
		await Clipboard.setString(address);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 2000,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') }
		});
	};

	goToAccountDetails = () => {
		this.props.navigation.push('AccountDetails');
	};

	render = () => {
		const {
			account: { name, address }
		} = this.props;

		const fiatBalance = Engine.getTotalFiatAccountBalance();

		if (!address) return null;

		return (
			<View style={styles.wrapper} testID={'account-overview'}>
				<TouchableOpacity style={styles.info} onPress={this.goToAccountDetails}>
					<Identicon address={address} size="38" />
					<Text style={styles.label}>{name}</Text>
					<Text style={styles.amountFiat}>{fiatBalance}</Text>
				</TouchableOpacity>
				<View style={styles.actions}>
					<TouchableOpacity type={'normal'} onPress={this.onSend} style={styles.button}>
						<View style={styles.buttonIconWrapper}>
							<MaterialIcon
								name={'send'}
								size={15}
								color={colors.primary}
								style={[styles.buttonIcon, styles.sendIcon]}
							/>
						</View>
						<Text style={styles.buttonText}>{strings('wallet.send_button')}</Text>
					</TouchableOpacity>
					<TouchableOpacity type={'normal'} onPress={this.onDeposit} style={styles.button}>
						<View style={styles.buttonIconWrapper}>
							<FoundationIcon
								name={'download'}
								size={18}
								color={colors.primary}
								style={[styles.buttonIcon, styles.depositIcon]}
							/>
						</View>
						<Text style={styles.buttonText}>{strings('wallet.deposit_button')}</Text>
					</TouchableOpacity>
					<TouchableOpacity type={'normal'} onPress={this.onCopy} style={styles.button}>
						<View style={styles.buttonIconWrapper}>
							<Icon
								name={'copy'}
								size={15}
								color={colors.primary}
								style={[styles.buttonIcon, styles.copyIcon]}
							/>
						</View>
						<Text style={styles.buttonText}>{strings('wallet.copy_address')}</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};
}
