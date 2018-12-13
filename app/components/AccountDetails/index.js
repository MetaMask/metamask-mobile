import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, Clipboard, Alert, InteractionManager, TextInput, ScrollView } from 'react-native';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode';
import { strings } from '../../../locales/i18n';
import Identicon from '../Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/FontAwesome';
import StyledButton from '../StyledButton';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import { getNavigationOptionsTitle } from '../Navbar';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	accountWrapper: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		marginTop: 20,
		borderBottomWidth: 2,
		borderBottomColor: colors.concrete
	},
	accountLabelWrapper: {
		marginTop: 10,
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	labelText: {
		fontSize: 28,
		textAlign: 'center',
		color: colors.black,
		...fontStyles.normal
	},
	labelActionIcons: {
		alignItems: 'center'
	},
	detailsWrapper: {
		padding: 10
	},
	qrCode: {
		marginVertical: 15,
		alignItems: 'center',
		justifyContent: 'center'
	},
	addressWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 10,
		marginTop: 10,
		marginBottom: 20,
		marginRight: 10,
		marginLeft: 10,
		borderRadius: 5,
		backgroundColor: colors.concrete
	},
	address: {
		fontSize: 12,
		...fontStyles.normal
	},
	icon: {
		marginLeft: 10,
		color: colors.gray
	},
	iconEdit: {
		padding: 10,
		color: colors.gray
	},
	actionsWrapper: {
		marginLeft: 50,
		marginRight: 50
	},
	button: {
		marginBottom: 10
	}
});

/**
 * View that contains details about the selected Address
 */
class AccountDetails extends Component {
	static navigationOptions = () => getNavigationOptionsTitle(strings('account_details.title'));

	state = {
		accountLabelEditable: false,
		accountLabel: '',
		originalAccountLabel: ''
	};

	static propTypes = {
		/**
		 * String that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		/* identities object required to get account name
		*/
		identities: PropTypes.object
	};

	componentDidMount = () => {
		const { identities, selectedAddress } = this.props;
		const accountLabel = identities[selectedAddress].name;
		this.setState({ accountLabel });
	};

	copyAccountToClipboard = async () => {
		const { selectedAddress } = this.props;
		await Clipboard.setString(selectedAddress);
		Alert.alert(strings('account_details.account_copied_to_clipboard'));
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

	goToRevealPrivateKey = () => {
		this.props.navigation.navigate('RevealPrivateCredential', { privateCredentialName: 'private_key' });
	};

	onShare = () => {
		const { selectedAddress } = this.props;
		Share.open({
			message: `${strings('account_details.share_public_key')} ${selectedAddress}`
		}).catch(err => {
			Logger.log('Error while trying to share address', err);
		});
	};

	setAccountLabel = () => {
		const { PreferencesController } = Engine.context;
		const { selectedAddress } = this.props;
		const { accountLabel } = this.state;
		PreferencesController.setAccountLabel(selectedAddress, accountLabel);
		this.setState({ accountLabelEditable: false });
	};

	onAccountLabelChange = accountLabel => {
		this.setState({ accountLabel });
	};

	setAccountLabelEditable = () => {
		this.setState({ accountLabelEditable: true });
	};

	cancelAccountLabelEdition = () => {
		const { identities, selectedAddress } = this.props;
		const accountLabel = identities[selectedAddress].name;
		this.setState({ accountLabelEditable: false, accountLabel });
	};

	render = () => {
		const { selectedAddress } = this.props;
		const { accountLabelEditable, accountLabel } = this.state;
		return (
			<ScrollView style={styles.wrapper} testID={'account-details-screen'}>
				<View style={styles.accountWrapper}>
					<Identicon address={selectedAddress} />
					<View style={styles.accountLabelWrapper}>
						<TextInput
							style={styles.labelText}
							editable={accountLabelEditable}
							onChangeText={this.onAccountLabelChange}
							onSubmitEditing={this.setAccountLabel}
							onBlur={this.cancelAccountLabelEdition}
							testID={'account-label-text-input'}
						>
							{accountLabel}
						</TextInput>
						<View style={styles.labelActionIcons}>
							{accountLabelEditable ? null : (
								<MaterialIcon
									name="edit"
									style={styles.iconEdit}
									size={22}
									onPress={this.setAccountLabelEditable}
									testID={'edit-account-label-icon'}
								/>
							)}
						</View>
					</View>
				</View>

				<View style={styles.detailsWrapper}>
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
						<Icon
							style={styles.icon}
							name="copy"
							size={22}
							color={colors.gray}
							onPress={this.copyAccountToClipboard}
							testID={'copy-public-address-icon'}
						/>
					</View>
				</View>

				<View style={styles.actionsWrapper}>
					<StyledButton
						containerStyle={styles.button}
						type={'normal'}
						onPress={this.onShare}
						testID={'share-account-button'}
					>
						{strings('account_details.share_account')}
					</StyledButton>
					<StyledButton
						containerStyle={styles.button}
						type={'normal'}
						onPress={this.goToEtherscan}
						testID={'view-account-button'}
					>
						{strings('account_details.view_account')}
					</StyledButton>
					<StyledButton
						containerStyle={styles.button}
						type={'warning'}
						onPress={this.goToRevealPrivateKey}
						testID={'show-private-key-button'}
					>
						{strings('account_details.show_private_key')}
					</StyledButton>
				</View>
			</ScrollView>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities
});

export default connect(mapStateToProps)(AccountDetails);
