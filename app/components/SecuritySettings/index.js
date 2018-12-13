import React, { Component } from 'react';
import { Switch, AsyncStorage, Platform, SafeAreaView, StyleSheet, Text, View, ScrollView } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import SecureKeychain from '../../core/SecureKeychain';
import StyledButton from '../StyledButton';
import ActionModal from '../ActionModal';
import { strings } from '../../../locales/i18n';
import { getNavigationOptionsTitle } from '../Navbar';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapperContent: {
		paddingLeft: 20,
		paddingRight: 20,
		paddingVertical: 20
	},
	text: {
		fontSize: 18,
		textAlign: 'left',
		marginBottom: 5,
		...fontStyles.normal
	},
	setting: {
		marginTop: Platform.OS === 'android' ? 20 : 22,
		marginBottom: Platform.OS === 'android' ? 20 : 22
	},
	modalView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		flexDirection: 'column'
	},
	modalText: {
		fontSize: 18,
		textAlign: 'center',
		...fontStyles.normal
	},
	modalTitle: {
		fontSize: 22,
		textAlign: 'center',
		...fontStyles.bold
	},
	biometrics: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 20,
		marginBottom: 30
	},
	biometryLabel: {
		flex: 1,
		fontSize: 16,
		...fontStyles.normal
	},
	biometrySwitch: {
		flex: 0
	}
});

/**
 * View that contains app settings
 */
class SecuritySettings extends Component {
	static navigationOptions = () => getNavigationOptionsTitle(strings('app_settings.title'));

	state = {
		biometryChoice: null,
		biometryType: null
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	componentDidMount = async () => {
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		if (biometryType) {
			const biometryChoice = await AsyncStorage.getItem('@MetaMask:biometryChoice');
			let bioEnabled = false;
			if (biometryChoice !== '' && biometryChoice === biometryType) {
				bioEnabled = true;
			}
			this.setState({ biometryType, biometryChoice: bioEnabled });
		}
	};

	onBiometryChange = async enabled => {
		this.setState({ biometryChoice: enabled });
		const credentials = await SecureKeychain.getGenericPassword();
		if (credentials) {
			await SecureKeychain.resetGenericPassword();
			const authOptions = {
				accessControl: enabled
					? SecureKeychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
					: SecureKeychain.ACCESS_CONTROL.DEVICE_PASSCODE
			};
			await SecureKeychain.setGenericPassword('metamask-user', credentials.password, authOptions);

			if (!enabled) {
				await AsyncStorage.removeItem('@MetaMask:biometryChoice');
			} else {
				await AsyncStorage.setItem('@MetaMask:biometryChoice', this.state.biometryType);
			}
		}
	};

	goToRevealPrivateCredential = () => {
		this.props.navigation.navigate('RevealPrivateCredential', { privateCredentialName: 'seed_phrase' });
	};

	renderBiometrics() {
		if (this.state.biometryType) {
			return (
				<View style={styles.setting}>
					<View style={styles.biometrics}>
						<Text style={styles.biometryLabel}>
							{strings(`biometrics.enable_${this.state.biometryType.toLowerCase()}`)}
						</Text>
						<Switch
							onValueChange={biometryChoice => this.onBiometryChange(biometryChoice)} // eslint-disable-line react/jsx-no-bind
							value={this.state.biometryChoice}
							style={styles.biometrySwitch}
							trackColor={Platform.OS === 'ios' ? { true: colors.primary, false: colors.concrete } : null}
							ios_backgroundColor={colors.slate}
						/>
					</View>
				</View>
			);
		}
	}

	render = () => (
		<SafeAreaView style={styles.wrapper} testID={'app-settings-screen'}>
			<ScrollView contentContainerStyle={styles.wrapperContent}>
				<ActionModal
					modalVisible={this.state.modalVisible}
					confirmText={strings('app_settings.reset_account_confirm_button')}
					cancelText={strings('app_settings.reset_account_cancel_button')}
					onCancelPress={this.cancelResetAccount}
					onRequestClose={this.cancelResetAccount}
					onConfirmPress={this.resetAccount}
				>
					<View style={styles.modalView}>
						<Text style={styles.modalTitle}>{strings('app_settings.reset_account_modal_title')}</Text>
						<Text style={styles.modalText}>{strings('app_settings.reset_account_modal_message')}</Text>
					</View>
				</ActionModal>
				{this.renderBiometrics()}
				<View style={styles.setting}>
					<Text style={styles.text}>{strings('app_settings.reveal_seed_words')}</Text>
					<StyledButton type="warning" onPress={this.goToRevealPrivateCredential}>
						{strings('app_settings.reveal_seed_words_button')}
					</StyledButton>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const mapStateToProps = state => ({
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(SecuritySettings);
