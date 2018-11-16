import React, { Component } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TextInput, TouchableOpacity, Clipboard, Alert } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../locales/i18n';
import ActionView from '../ActionView';
import Icon from 'react-native-vector-icons/FontAwesome';
import Engine from '../../core/Engine';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	header: {
		borderBottomColor: colors.accentGray,
		borderBottomWidth: 1,
		...fontStyles.normal
	},
	seedPhrase: {
		backgroundColor: colors.white,
		marginTop: 10,
		paddingBottom: 20,
		paddingLeft: 20,
		paddingRight: 20,
		borderColor: colors.accentGray,
		borderBottomWidth: 1,
		fontSize: 20,
		textAlign: 'center',
		color: colors.black,
		...fontStyles.normal
	},
	seedPhraseView: {
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.accentGray,
		marginTop: 10,
		alignItems: 'center'
	},
	privateCredentialAction: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	rowWrapper: {
		padding: 20
	},
	warningWrapper: {
		backgroundColor: colors.lightRed
	},
	warningRowWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignContent: 'center',
		alignItems: 'center'
	},
	warningText: {
		color: colors.error,
		...fontStyles.normal
	},
	input: {
		borderWidth: 2,
		borderRadius: 5,
		borderColor: colors.concrete,
		padding: 10
	},
	icon: {
		margin: 10,
		color: colors.red
	},
	actionIcon: {
		margin: 10,
		color: colors.primary
	},
	actionText: {
		color: colors.primary
	},
	warningMessageText: {
		marginLeft: 10,
		marginRight: 40,
		...fontStyles.normal
	}
});

/**
 * View that displays private account information as private key or seed phrase
 */
class RevealPrivateCredential extends Component {
	state = {
		privateCredential: '',
		unlocked: false,
		password: '',
		warningIncorrectPassword: ''
	};

	static navigationOptions = ({ navigation }) => ({
		title: strings(`reveal_credential.${navigation.getParam('privateCredentialName', '')}_title`),
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	});

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	cancel = () => {
		const { navigation } = this.props;
		navigation.pop();
	};

	tryUnlock = async () => {
		const { KeyringController } = Engine.context;
		const { password } = this.state;
		const {
			selectedAddress,
			navigation: {
				state: {
					params: { privateCredentialName }
				}
			}
		} = this.props;

		try {
			await KeyringController.submitPassword(password);
			if (privateCredentialName === 'seed_phrase') {
				const privateCredential = JSON.stringify(KeyringController.keyring.keyrings[0].mnemonic).replace(
					/"/g,
					''
				);
				this.setState({ privateCredential, unlocked: true });
			} else if (privateCredentialName === 'private_key') {
				const privateCredential = await KeyringController.exportAccount(selectedAddress);
				this.setState({ privateCredential, unlocked: true });
			}
		} catch (e) {
			this.setState({
				unlock: false,
				warningIncorrectPassword: strings('reveal_credential.warning_incorrect_password')
			});
		}
	};

	onPasswordChange = password => {
		this.setState({ password });
	};

	copyPrivateCredentialToClipboard = async () => {
		const { privateCredential } = this.state;
		const {
			navigation: {
				state: {
					params: { privateCredentialName }
				}
			}
		} = this.props;
		await Clipboard.setString(privateCredential);
		Alert.alert(strings(`reveal_credential.${privateCredentialName}_copied`));
	};

	render() {
		const { unlocked, privateCredential } = this.state;
		const {
			navigation: {
				state: {
					params: { privateCredentialName }
				}
			}
		} = this.props;
		return (
			<SafeAreaView style={styles.wrapper} testID={'reveal-private-credential-screen'}>
				<ActionView
					cancelText={strings('reveal_credential.cancel')}
					confirmText={strings('reveal_credential.confirm')}
					onCancelPress={this.cancel}
					onConfirmPress={this.tryUnlock}
					showConfirmButton={!unlocked}
				>
					<View style={[styles.rowWrapper, styles.header]}>
						<Text>{strings(`reveal_credential.${privateCredentialName}_explanation`)}</Text>
					</View>
					<View style={styles.warningWrapper}>
						<View style={[styles.rowWrapper, styles.warningRowWrapper]}>
							<Icon style={styles.icon} name="warning" size={22} />
							<Text style={styles.warningMessageText}>
								{strings(`reveal_credential.${privateCredentialName}_warning_explanation`)}
							</Text>
						</View>
					</View>

					<View style={styles.rowWrapper}>
						{unlocked ? (
							<View>
								<Text>{strings(`reveal_credential.${privateCredentialName}`)}</Text>
								<View style={styles.seedPhraseView}>
									<TextInput
										value={privateCredential}
										numberOfLines={3}
										multiline
										selectTextOnFocus
										style={styles.seedPhrase}
										editable={false}
										testID={'private-credential-text'}
									/>
									<TouchableOpacity
										style={styles.privateCredentialAction}
										onPress={this.copyPrivateCredentialToClipboard}
										testID={'private-credential-touchable'}
									>
										<Icon style={styles.actionIcon} name="copy" size={18} />
										<Text style={styles.actionText}>
											{strings('reveal_credential.copy_to_clipboard')}
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						) : (
							<View>
								<Text>{strings('reveal_credential.enter_password')}</Text>
								<TextInput
									style={styles.input}
									placeholder={'Password'}
									onChangeText={this.onPasswordChange}
									secureTextEntry
									onSubmitEditing={this.tryUnlock}
									testID={'private-credential-password-text-input'}
								/>
								<Text style={styles.warningText}>{this.state.warningIncorrectPassword}</Text>
							</View>
						)}
					</View>
				</ActionView>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(RevealPrivateCredential);
