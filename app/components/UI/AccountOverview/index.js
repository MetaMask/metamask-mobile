import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Clipboard, Alert, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Identicon from '../Identicon';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { setTokensTransaction } from '../../../actions/transaction';
import { connect } from 'react-redux';
import { renderFiat } from '../../../util/number';

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
		paddingTop: 3,
		alignItems: 'center',
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
	}
});

/**
 * View that's part of the <Wallet /> component
 * which shows information about the selected account
 */
class AccountOverview extends Component {
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
		showAlert: PropTypes.func.isRequired,
		/**
		 * Action that sets a tokens type transaction
		 */
		setTokensTransaction: PropTypes.func.isRequired,
		/**
		/* Selected currency
		*/
		currentCurrency: PropTypes.string
	};

	onDeposit = () => {
		Alert.alert(strings('drawer.coming_soon'));
	};

	onSend = () => {
		this.props.setTokensTransaction({ symbol: 'ETH' });
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

	render() {
		const {
			account: { name, address },
			currentCurrency
		} = this.props;

		const fiatBalance = renderFiat(Engine.getTotalFiatAccountBalance(), currentCurrency);

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
								name={'arrow-top-right'}
								size={22}
								color={colors.primary}
								style={styles.buttonIcon}
							/>
						</View>
						<Text style={styles.buttonText}>{strings('wallet.send_button')}</Text>
					</TouchableOpacity>
					<TouchableOpacity type={'normal'} onPress={this.onDeposit} style={styles.button}>
						<View style={styles.buttonIconWrapper}>
							<MaterialIcon
								name={'arrow-collapse-down'}
								size={20}
								color={colors.primary}
								style={styles.buttonIcon}
							/>
						</View>
						<Text style={styles.buttonText}>{strings('wallet.deposit_button')}</Text>
					</TouchableOpacity>
					<TouchableOpacity type={'normal'} onPress={this.onCopy} style={styles.button}>
						<View style={styles.buttonIconWrapper}>
							<Icon name={'copy'} size={17} color={colors.primary} style={styles.buttonIcon} />
						</View>
						<Text style={styles.buttonText}>{strings('wallet.copy_address')}</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	setTokensTransaction: asset => dispatch(setTokensTransaction(asset))
});

export default connect(
	null,
	mapDispatchToProps
)(AccountOverview);
