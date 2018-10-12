import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, Clipboard, Alert, InteractionManager } from 'react-native';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode';
import { strings } from '../../../locales/i18n';
import Identicon from '../Identicon';
import Icon from 'react-native-vector-icons/FontAwesome';
import StyledButton from '../StyledButton';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	text: {
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
	accountWrapper: {
		paddingTop: 15,
		paddingBottom: 15,
		alignItems: 'center',
		justifyContent: 'center',
		borderBottomWidth: 2,
		borderBottomColor: colors.concrete
	},
	detailsWrapper: {
		padding: 20
	},
	addressWrapper: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 10,
		margin: 10,
		borderRadius: 5,
		backgroundColor: colors.concrete
	},
	buttonWrapper: {
		marginLeft: 50,
		marginRight: 50
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

	copyToClipboard = async toCopy => {
		await Clipboard.setString(toCopy);
		Alert.alert('Copied to clipboard');
	};

	copyAccountToClipboard = async () => {
		const { selectedAddress } = this.props;
		this.copyToClipboard(selectedAddress);
	};

	copyPrivateKeyToClipboard = async () => {
		const { KeyringController } = Engine.context;
		const { selectedAddress } = this.props;
		const privateKey = await KeyringController.exportAccount(selectedAddress);
		this.copyToClipboard(privateKey);
	};

	goToEtherscan = () => {
		const { selectedAddress } = this.props;
		const url = `https://etherscan.io/address/${selectedAddress}`;
		this.props.navigation.pop();
		InteractionManager.runAfterInteractions(() => {
			this.props.navigation.navigate('BrowserView', {
				url
			});
		});
	};

	share = () => {
		const { selectedAddress } = this.props;
		Share.open({
			message: `Sharing my public key! ${selectedAddress}`
		}).catch(err => {
			Logger.log('Error while trying to share address', err);
		});
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
				<View style={styles.accountWrapper}>
					<Identicon address={selectedAddress} />
					<Text style={styles.textHeader}>{accountName}</Text>
				</View>
				<View style={styles.detailsWrapper}>
					<Text style={styles.text}>{strings('accountDetails.publicAddress')}</Text>
					<View style={styles.qrCode}>
						<QRCode
							value={selectedAddress}
							size={120}
							bgColor={colors.fontPrimary}
							fgColor={colors.white}
						/>
					</View>
					<View style={styles.addressWrapper}>
						<Text style={styles.address} testID={'public-address-text'}>
							{selectedAddress}
						</Text>
						<Icon name="copy" size={22} style={styles.icon} onPress={this.copyToClipboard} />
					</View>

					<View style={styles.buttonWrapper}>
						<StyledButton containerStyle={styles.button} type={'normal'} onPress={this.share}>
							{strings('accountDetails.shareAccount')}
						</StyledButton>
						<StyledButton containerStyle={styles.button} type={'normal'} onPress={this.goToEtherscan}>
							{strings('accountDetails.viewAccount')}
						</StyledButton>
						<StyledButton
							containerStyle={styles.button}
							type={'warning'}
							onPress={this.copyPrivateKeyToClipboard}
						>
							{strings('accountDetails.downloadPrivateKey')}
						</StyledButton>
					</View>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(AccountDetails);
