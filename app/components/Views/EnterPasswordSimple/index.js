import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, Alert, Text, View, TextInput, SafeAreaView, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import StyledButton from '../../UI/StyledButton';

import { colors, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { passwordRequirementsMet } from '../../../util/password';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		padding: 16
	},
	input: {
		borderWidth: 2,
		borderRadius: 5,
		borderColor: colors.grey000,
		padding: 10
	},
	ctaWrapper: {
		marginTop: 10
	},
	enterPassword: {
		color: colors.black,
		fontSize: 16,
		marginBottom: 15
	}
});

/**
 * View where users can re-enter their password
 */
export default class EnterPasswordSimple extends PureComponent {
	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(strings('enter_password.title'), navigation);

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	state = {
		password: '',
		loading: false,
		error: null
	};

	mounted = true;

	componentWillUnmount() {
		this.mounted = false;
	}

	onPressConfirm = async () => {
		if (this.state.loading) return;
		if (!passwordRequirementsMet(this.state.password)) {
			Alert.alert(strings('enter_password.error'), strings('choose_password.password_length_error'));
		} else {
			this.props.navigation.state.params.onPasswordSet(this.state.password);
			this.props.navigation.pop();
			return;
		}
	};

	onPasswordChange = val => {
		this.setState({ password: val });
	};

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<View style={styles.wrapper} testID={'enter-password-screen'}>
					<KeyboardAwareScrollView style={styles.wrapper} resetScrollToCoords={{ x: 0, y: 0 }}>
						<View style={baseStyles.flexGrow}>
							<View>
								<Text style={styles.enterPassword}>{strings('enter_password.desc')}</Text>
								<TextInput
									style={styles.input}
									placeholder={strings('enter_password.password')}
									placeholderTextColor={colors.grey100}
									onChangeText={this.onPasswordChange}
									secureTextEntry
									onSubmitEditing={this.onPressConfirm}
								/>
							</View>
							<View style={styles.ctaWrapper}>
								<StyledButton
									type={'blue'}
									onPress={this.onPressConfirm}
									testID={'submit-button'}
									disabled={
										!(this.state.password !== '' || !passwordRequirementsMet(this.state.password))
									}
								>
									{this.state.loading ? (
										<ActivityIndicator size="small" color="white" />
									) : (
										strings('enter_password.confirm_button')
									)}
								</StyledButton>
							</View>
						</View>
					</KeyboardAwareScrollView>
				</View>
			</SafeAreaView>
		);
	}
}
