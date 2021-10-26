import React, { useEffect, useState } from 'react';
import {
	SafeAreaView,
	ScrollView,
	StyleSheet,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	Dimensions,
} from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import StyledButton from '../../UI/StyledButton';
import Encryptor from '../../../core/Encryptor';
import Icon from 'react-native-vector-icons/FontAwesome';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import QRCode from 'react-native-qrcode-svg';
import ClipboardManager from '../../../core/ClipboardManager';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	informationWrapper: {
		flex: 1,
		paddingHorizontal: 24,
	},
	rowWrapper: {
		padding: 20,
	},
	warningWrapper: {
		backgroundColor: colors.red000,
		padding: 20,
	},
	warningRowWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignContent: 'center',
		alignItems: 'center',
	},
	label: {
		fontSize: 14,
		paddingVertical: 12,
		color: colors.fontPrimary,
		...fontStyles.bold,
	},
	icon: {
		margin: 10,
		color: colors.red,
	},
	warningMessageText: {
		marginLeft: 10,
		marginRight: 40,
		...fontStyles.normal,
	},
	input: {
		...fontStyles.normal,
		borderColor: colors.grey200,
		borderRadius: 5,
		borderWidth: 2,
		padding: 10,
	},
	buttonsWrapper: {
		marginVertical: 12,
		flexDirection: 'row',
		alignSelf: 'flex-end',
	},
	buttonsContainer: {
		flex: 1,
		flexDirection: 'column',
		alignSelf: 'flex-end',
	},
	privateCredentialAction: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
	},
	seedPhrase: {
		backgroundColor: colors.white,
		marginTop: 10,
		paddingBottom: 20,
		paddingLeft: 20,
		paddingRight: 20,
		borderColor: colors.grey400,
		borderBottomWidth: 1,
		fontSize: 20,
		textAlign: 'center',
		color: colors.black,
		...fontStyles.normal,
	},
	seedPhraseView: {
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.grey400,
		marginTop: 10,
		alignItems: 'center',
	},
	qrCodeWrapper: {
		marginTop: 20,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionIcon: {
		margin: 10,
		color: colors.blue,
	},
	actionText: {
		color: colors.blue,
	},
	tabContent: {
		padding: 20,
	},
});

interface Props {
	navigation: any;
	route: any;
}

/**
 * View that displays all the active WalletConnect Sessions
 */
const VaultRecoveryView = ({ navigation, route }: Props) => {
	const isFullScreenModal = route?.params?.isFullScreenModal;
	const [inputWidth, setInputWidth] = useState({ width: '99%' });
	const [password, setPassword] = useState('');
	const [vault, setVault] = useState('');
	const [srp, setSrp] = useState(undefined);

	useEffect(() => {
		navigation.setOptions(getNavigationOptionsTitle('Vault Recovery', navigation, isFullScreenModal));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onVaultChange = (cipherEntry: string) => {
		console.log(cipherEntry);
		setVault(cipherEntry);
	};

	const onPasswordChange = async (passwordEntry: string) => {
		console.log(passwordEntry);
		setPassword(passwordEntry);
	};

	const decryptVault = async () => {
		const encryptor = new Encryptor();
		const SRP = await encryptor.decrypt(password, vault);
		setSrp(SRP[0].data.mnemonic);
	};

	const copyPrivateCredentialToClipboard = async () => {
		await ClipboardManager.setStringExpire(srp);
		// this.props.showAlert({
		// 	isVisible: true,
		// 	autodismiss: 1500,
		// 	content: 'clipboard-alert',
		// 	data: {
		// 		msg: `${strings(`reveal_credential.seed_phrase_copied`)}\n${strings(
		// 			`reveal_credential.seed_phrase_copied_time`
		// 		)}`,
		// 		width: '70%',
		// 	},
		// });
	};

	return (
		<SafeAreaView style={styles.wrapper}>
			<View style={styles.warningWrapper}>
				<View style={[styles.rowWrapper, styles.warningRowWrapper]}>
					<Icon style={styles.icon} name="warning" size={22} />
					<Text style={styles.warningMessageText}>
						{strings('reveal_credential.seed_phrase_warning_explanation')}
					</Text>
				</View>
			</View>
			<ScrollView style={styles.informationWrapper}>
				{srp && (
					<ScrollableTabView>
						<View tabLabel={strings(`reveal_credential.text`)} style={styles.tabContent}>
							<Text>{strings(`reveal_credential.seed_phrase`)}</Text>
							<View style={styles.seedPhraseView}>
								<TextInput
									value={srp}
									numberOfLines={3}
									multiline
									selectTextOnFocus
									style={styles.seedPhrase}
									editable={false}
									testID={'private-credential-text'}
								/>
								<TouchableOpacity
									style={styles.privateCredentialAction}
									onPress={copyPrivateCredentialToClipboard}
									testID={'private-credential-touchable'}
								>
									<Icon style={styles.actionIcon} name="copy" size={18} />
									<Text style={styles.actionText}>
										{strings('reveal_credential.copy_to_clipboard')}
									</Text>
								</TouchableOpacity>
							</View>
						</View>
						<View tabLabel={strings(`reveal_credential.qr_code`)} style={styles.tabContent}>
							<View style={styles.qrCodeWrapper}>
								<QRCode value={srp} size={Dimensions.get('window').width - 160} />
							</View>
						</View>
					</ScrollableTabView>
				)}
				{!srp && (
					<>
						<Text style={styles.label}>Vault Data</Text>
						<TextInput
							style={[styles.input, inputWidth]}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={vault}
							editable
							numberOfLines={3}
							multiline
							onChangeText={onVaultChange}
							placeholder="Vault"
							returnKeyType="next"
							placeholderTextColor={colors.grey100}
						/>
						<Text style={styles.label}>Vault Password</Text>
						<TextInput
							style={[styles.input, inputWidth]}
							value={password}
							onChangeText={onPasswordChange}
							secureTextEntry
							placeholder="Password"
							autoCapitalize="none"
						/>
						<View style={styles.buttonsWrapper}>
							<View style={styles.buttonsContainer}>
								<StyledButton type="confirm" onPress={decryptVault}>
									DECRYPT
								</StyledButton>
							</View>
						</View>
					</>
				)}
			</ScrollView>
		</SafeAreaView>
	);
};

export default VaultRecoveryView;
