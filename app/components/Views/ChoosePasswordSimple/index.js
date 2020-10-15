import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	Animated,
	ActivityIndicator,
	Alert,
	Text,
	View,
	TextInput,
	SafeAreaView,
	StyleSheet,
	TouchableOpacity
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { connect } from 'react-redux';
import { passwordSet } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import StyledButton from '../../UI/StyledButton';
import Device from '../../../util/Device';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import Icon from 'react-native-vector-icons/FontAwesome';
import zxcvbn from 'zxcvbn';
import { getPasswordStrengthWord, passwordRequirementsMet } from '../../../util/password';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		padding: 20
	},
	content: {
		alignItems: 'flex-start'
	},
	subtitle: {
		fontSize: 16,
		lineHeight: 23,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	text: {
		marginBottom: 10,
		justifyContent: 'center'
	},

	label: {
		position: 'absolute',
		marginTop: -35,
		marginLeft: 5,
		fontSize: 16,
		color: colors.fontSecondary,
		textAlign: 'left',
		...fontStyles.normal
	},
	field: {
		marginTop: 20,
		marginBottom: 10
	},
	input: {
		borderBottomWidth: Device.isAndroid() ? 0 : 1,
		borderBottomColor: colors.grey100,
		paddingLeft: 0,
		paddingVertical: 10,
		borderRadius: 4,
		fontSize: Device.isAndroid() ? 14 : 20,
		...fontStyles.normal
	},
	ctaWrapper: {
		marginTop: 20,
		paddingHorizontal: 10
	},
	errorMsg: {
		color: colors.red,
		...fontStyles.normal
	},
	passwordStrengthLabel: {
		height: 20,
		marginLeft: 5,
		marginTop: 10,
		fontSize: 12,
		color: colors.fontSecondary,
		textAlign: 'left',
		...fontStyles.normal
	},
	// eslint-disable-next-line react-native/no-unused-styles
	strength_weak: {
		color: colors.red
	},
	// eslint-disable-next-line react-native/no-unused-styles
	strength_good: {
		color: colors.blue
	},
	// eslint-disable-next-line react-native/no-unused-styles
	strength_strong: {
		color: colors.green300
	},
	showHideToggle: {
		backgroundColor: colors.white,
		position: 'absolute',
		marginTop: 8,
		alignSelf: 'flex-end'
	},
	showMatchingPasswords: {
		position: 'absolute',
		marginTop: 8,
		alignSelf: 'flex-end'
	}
});

/**
 * View where users can set their password
 * for the first time
 */
class ChoosePasswordSimple extends PureComponent {
	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(strings('app_settings.create_password'), navigation);

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	state = {
		password: '',
		confirmPassword: '',
		secureTextEntry: true,
		biometryType: null,
		biometryChoice: false,
		rememberMe: false,
		labelsScaleNew: new Animated.Value(1),
		labelsScaleConfirm: new Animated.Value(1),
		loading: false,
		error: null
	};

	startX = 0;
	startY = 0;
	width = 100;
	height = 24;
	initialScale = 1;
	endX = 0;
	endY = 50;

	mounted = true;
	passive = false;

	confirmPasswordInput = React.createRef();

	componentWillUnmount() {
		this.mounted = false;
	}

	onPressCreate = async () => {
		if (this.state.loading) return;
		let error = null;
		if (!passwordRequirementsMet(this.state.password)) {
			error = strings('choose_password.password_length_error');
		} else if (this.state.password !== this.state.confirmPassword) {
			error = strings('choose_password.password_dont_match');
		}

		if (error) {
			Alert.alert('Error', error);
		} else {
			this.props.navigation.state.params.onPasswordSet(this.state.password);
			this.props.navigation.pop();
			return;
		}
	};

	jumpToConfirmPassword = () => {
		const { current } = this.confirmPasswordInput;
		current && current.focus();
	};

	animateInLabel = label => {
		if (
			(label === 'new' && this.state.password !== '') ||
			(label === 'confirm' && this.state.confirmPassword !== '')
		) {
			return;
		}
		Animated.timing(label === 'new' ? this.state.labelsScaleNew : this.state.labelsScaleConfirm, {
			toValue: 1,
			duration: 200,
			useNativeDriver: true,
			isInteraction: false
		}).start();
	};

	animateOutLabel = label => {
		Animated.timing(label === 'new' ? this.state.labelsScaleNew : this.state.labelsScaleConfirm, {
			toValue: 0.66,
			duration: 200,
			useNativeDriver: true,
			isInteraction: false
		}).start();
	};

	onPasswordChange = val => {
		const passInfo = zxcvbn(val);

		this.setState({ password: val, passwordStrength: passInfo.score });
	};

	toggleShowHide = () => {
		this.setState({ secureTextEntry: !this.state.secureTextEntry });
	};

	render() {
		const { passwordStrength, startX, startY, width, height, initialScale, endX, endY } = this;
		const passwordStrengthWord = getPasswordStrengthWord(passwordStrength);

		return (
			<SafeAreaView style={styles.mainWrapper}>
				<View style={styles.wrapper} testID={'choose-password-screen'}>
					<KeyboardAwareScrollView style={styles.wrapper} resetScrollToCoords={{ x: 0, y: 0 }}>
						<View testID={'create-password-screen'}>
							<View style={styles.content}>
								<View style={styles.text}>
									<Text style={styles.subtitle}>{strings('choose_password.subtitle')}</Text>
								</View>
							</View>
							<View style={styles.field}>
								<Animated.Text
									style={[
										styles.label,
										{
											transform: [
												{
													scale: this.state.labelsScaleNew
												},
												{
													translateX: this.state.labelsScaleNew.interpolate({
														inputRange: [0, 1],
														outputRange: [
															startX - width / 2 - (width * initialScale) / 2,
															endX
														]
													})
												},
												{
													translateY: this.state.labelsScaleNew.interpolate({
														inputRange: [0, 1],
														outputRange: [
															startY - height / 2 - (height * initialScale) / 2,
															endY
														]
													})
												}
											]
										}
									]}
								>
									{strings('choose_password.password')}
								</Animated.Text>
								<TextInput
									style={styles.input}
									value={this.state.password}
									onChangeText={this.onPasswordChange} // eslint-disable-line  react/jsx-no-bind
									secureTextEntry={this.state.secureTextEntry}
									placeholder={''}
									placeholderTextColor={colors.grey100}
									underlineColorAndroid={colors.grey100}
									testID={'input-password'}
									onSubmitEditing={this.jumpToConfirmPassword}
									returnKeyType={'next'}
									onFocus={() => this.animateOutLabel('new')} // eslint-disable-line  react/jsx-no-bind
									onBlur={() => this.animateInLabel('new')} // eslint-disable-line  react/jsx-no-bind
									autoCapitalize="none"
								/>
								<TouchableOpacity onPress={this.toggleShowHide} style={styles.showHideToggle}>
									<Text style={styles.passwordStrengthLabel}>
										{strings(`choose_password.${this.state.secureTextEntry ? 'show' : 'hide'}`)}
									</Text>
								</TouchableOpacity>
								{(this.state.password !== '' && (
									<Text style={styles.passwordStrengthLabel}>
										{strings('choose_password.password_strength')}
										<Text style={styles[`strength_${passwordStrengthWord}`]}>
											{' '}
											{strings(`choose_password.strength_${passwordStrengthWord}`)}
										</Text>
									</Text>
								)) || <Text style={styles.passwordStrengthLabel} />}
							</View>
							<View style={styles.field}>
								<Animated.Text
									style={[
										styles.label,
										{
											transform: [
												{
													scale: this.state.labelsScaleConfirm
												},
												{
													translateX: this.state.labelsScaleConfirm.interpolate({
														inputRange: [0, 1],
														outputRange: [
															startX - width / 2 - (width * initialScale) / 2,
															endX
														]
													})
												},
												{
													translateY: this.state.labelsScaleConfirm.interpolate({
														inputRange: [0, 1],
														outputRange: [
															startY - height / 2 - (height * initialScale) / 2,
															endY
														]
													})
												}
											]
										}
									]}
								>
									{strings('choose_password.confirm_password')}
								</Animated.Text>
								<TextInput
									ref={this.confirmPasswordInput}
									style={styles.input}
									value={this.state.confirmPassword}
									onChangeText={val => this.setState({ confirmPassword: val })} // eslint-disable-line  react/jsx-no-bind
									secureTextEntry={this.state.secureTextEntry}
									placeholder={''}
									placeholderTextColor={colors.grey100}
									underlineColorAndroid={colors.grey100}
									testID={'input-password-confirm'}
									onSubmitEditing={this.onPressCreate}
									returnKeyType={'done'}
									onFocus={() => this.animateOutLabel('confirm')} // eslint-disable-line  react/jsx-no-bind
									onBlur={() => this.animateInLabel('confirm')} // eslint-disable-line  react/jsx-no-bind
									autoCapitalize="none"
								/>
								<View style={styles.showMatchingPasswords}>
									{this.state.password !== '' &&
									this.state.password === this.state.confirmPassword ? (
										<Icon name="check" size={12} color={colors.green300} />
									) : null}
								</View>
								<Text style={styles.passwordStrengthLabel}>
									{strings('choose_password.must_be_at_least', { number: 8 })}
								</Text>
							</View>

							{!!this.state.error && <Text style={styles.errorMsg}>{this.state.error}</Text>}
						</View>
					</KeyboardAwareScrollView>
					<View style={styles.ctaWrapper}>
						<StyledButton
							type={'blue'}
							onPress={this.onPressCreate}
							testID={'submit-button'}
							disabled={
								!(this.state.password !== '' && this.state.password === this.state.confirmPassword)
							}
						>
							{this.state.loading ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								strings('choose_password.create_button')
							)}
						</StyledButton>
					</View>
				</View>
			</SafeAreaView>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	passwordSet: () => dispatch(passwordSet()),
	setLockTime: time => dispatch(setLockTime(time))
});

export default connect(
	null,
	mapDispatchToProps
)(ChoosePasswordSimple);
