import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, Clipboard, Alert } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode';
import { strings } from '../../../locales/i18n';
import Identicon from '../Identicon';
import Icon from 'react-native-vector-icons/FontAwesome';
import StyledButton from '../StyledButton';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 20
	},
	text: {
		marginTop: 20,
		fontSize: 18,
		textAlign: 'center',
		...fontStyles.normal
	},
	textHeader: {
		marginTop: 10,
		fontSize: 28,
		textAlign: 'center',
		...fontStyles.normal
	},
	address: {
		fontSize: 12,
		flex: 1,
		...fontStyles.normal
	},
	qrCode: {
		marginTop: 10,
		alignItems: 'center',
		justifyContent: 'center'
	},
	accountHeader: {
		marginTop: 10,
		alignItems: 'center',
		justifyContent: 'center'
	},
	addressWrapper: {
		marginTop: 10,
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 5,
		padding: 15,
		borderColor: colors.borderColor,
		backgroundColor: colors.concrete
	},
	buttonWrapper: {
		marginLeft: 30,
		marginRight: 30
	},
	button: {
		marginTop: 10
	}
});

/**
 * View that contains details about the selected Address
 */
class AccountDetails extends Component {
	static navigationOptions = {
		title: strings('accountDetails.title'),
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	};

	static propTypes = {
		/**
		 * String that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	copyToClipboard = async () => {
		const { selectedAddress } = this.props;
		await Clipboard.setString(selectedAddress);
		Alert.alert('Copied to clipboard');
	};

	render() {
		const {
			selectedAddress,
			navigation: {
				state: {
					params: { accountName }
				}
			}
		} = this.props;
		return (
			<View style={styles.wrapper} testID={'account-details-screen'}>
				<View style={styles.accountHeader}>
					<Identicon address={selectedAddress} />
					<Text style={styles.textHeader}>{accountName}</Text>
				</View>
				<Text style={styles.text}>{strings('accountDetails.public_address')}</Text>
				<View style={styles.qrCode}>
					<QRCode value={selectedAddress} size={120} bgColor={colors.fontPrimary} fgColor={colors.white} />
				</View>
				<View style={styles.addressWrapper}>
					<Text style={styles.address} testID={'public-address-text'}>
						{selectedAddress}
					</Text>
					<Icon name="copy" size={22} style={styles.icon} onPress={() => this.copyToClipboard()} />
				</View>
				<View style={styles.buttonWrapper}>
					<StyledButton containerStyle={styles.button} type={'normal'}>
						{strings('accountDetails.share_account')}
					</StyledButton>
					<StyledButton containerStyle={styles.button} type={'normal'}>
						{strings('accountDetails.view_account')}
					</StyledButton>
					<StyledButton containerStyle={styles.button} type={'warning'}>
						{strings('accountDetails.download_private_key')}
					</StyledButton>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(AccountDetails);
