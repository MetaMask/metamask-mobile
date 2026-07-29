import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Platform,
  ActivityIndicator,
  Alert,
  InteractionManager,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Text,
  TextColor,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  HeaderStandard,
  Icon,
  IconName,
  IconSize,
  Box,
  Label,
  FontWeight,
  TextField,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  BoxBackgroundColor,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import StorageWrapper from '../../../store/storage-wrapper';
import { useSelector, useDispatch } from 'react-redux';
import { passwordSet } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { PREVIOUS_SCREEN } from '../../../constants/navigation';
import {
  TRUE,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import {
  passwordRequirementsMet,
  MIN_PASSWORD_LENGTH,
} from '../../../util/password';
import NotificationManager from '../../../core/NotificationManager';
import { passcodeType } from '../../../util/authentication';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { useTheme } from '../../../util/theme';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import { recreateVaultsWithNewPassword } from '../../../core/Vault';
import Logger from '../../../util/Logger';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ChoosePasswordSelectorsIDs } from '../ChoosePassword/ChoosePassword.testIds';
import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../../core/NavigationService';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import LottieView, { AnimationObject } from 'lottie-react-native';
import {
  selectSeedlessOnboardingLoginFlow,
  selectSeedlessOnboardingAuthConnection,
} from '../../../selectors/seedlessOnboardingController';
import { SeedlessOnboardingControllerErrorMessage } from '@metamask/seedless-onboarding-controller';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
import { ReauthenticateErrorType } from '../../../core/Authentication/types';
import Device from '../../../util/device';
import SearchingFox from '../../../animations/Searching_Fox.json';
import {
  PASSWORD_GUIDE_URL,
  RESET_PASSWORD_GUIDE_URL,
  RESET_PASSWORD_SOCIAL_LOGIN_URL,
} from '../../../constants/urls';

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

const getCommonButtonProps = () => ({
  variant: ButtonVariant.Primary,
  size: ButtonSize.Lg,
  twClassName: 'w-full',
});

interface ResetPasswordNavigation {
  goBack(): void;
  navigate(screen: string, params?: Record<string, unknown>): void;
  replace(screen: string, params?: Record<string, unknown>): void;
}

interface ResetPasswordRoute {
  params?: {
    [PREVIOUS_SCREEN]?: string;
  };
}

interface ResetPasswordProps {
  navigation: ResetPasswordNavigation;
  route: ResetPasswordRoute;
}

/**
 * View where users can reset their password
 */
const ResetPassword = ({ navigation, route }: ResetPasswordProps) => {
  const dispatch = useDispatch();
  const { colors, themeAppearance } = useTheme();
  const tw = useTailwind();

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );
  const authConnection = useSelector(selectSeedlessOnboardingAuthConnection);

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [biometryType, setBiometryType] = useState<string | null>(null);
  const [biometryChoice, setBiometryChoice] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [originalPassword, setOriginalPassword] = useState<string | null>(null);
  const [showPasswordIndex, setShowPasswordIndex] = useState<number[]>([0, 1]);
  const [isPasswordFieldFocused, setIsPasswordFieldFocused] = useState(false);
  const [warningIncorrectPassword, setWarningIncorrectPassword] = useState<
    string | undefined
  >(undefined);

  const confirmPasswordInput = useRef<TextInput | null>(null);

  const reauthenticate = useCallback(async (pwd?: string) => {
    try {
      const { password: verifiedPassword } =
        await Authentication.reauthenticate(pwd);
      setOriginalPassword(verifiedPassword);
      setWarningIncorrectPassword(undefined);
      return verifiedPassword;
    } catch (e) {
      const reauthError = e as Error;
      if (
        !reauthError.message.includes(
          ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS,
        )
      ) {
        setWarningIncorrectPassword(
          strings('reveal_credential.warning_incorrect_password'),
        );
      }
      return undefined;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      let authData;
      let previouslyDisabled: string | null;
      let passcodePreviouslyDisabled: string | null;

      try {
        authData = await Authentication.getType();
        previouslyDisabled = await StorageWrapper.getItem(
          BIOMETRY_CHOICE_DISABLED,
        );
        passcodePreviouslyDisabled =
          await StorageWrapper.getItem(PASSCODE_DISABLED);
      } catch (e) {
        Logger.error(e as Error);
        return;
      }

      if (
        authData.currentAuthType === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION
      ) {
        setBiometryType(passcodeType(authData.currentAuthType));
        setBiometryChoice(
          !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE),
        );
      } else if (authData.availableBiometryType) {
        setBiometryType(authData.availableBiometryType);
        setBiometryChoice(!(previouslyDisabled && previouslyDisabled === TRUE));
      }
    };

    initAuth();
  }, []);

  const handleSeedlessChangePasswordError = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: strings(
          'reset_password.seedless_change_password_error_modal_title',
        ),
        description: strings(
          'reset_password.seedless_change_password_error_modal_content',
        ),
        primaryButtonLabel: strings(
          'reset_password.seedless_change_password_error_modal_confirm',
        ),
        type: 'error',
        icon: IconName.Danger,
        isInteractable: false,
        onPrimaryButtonPress: async () => {
          navigation.replace(Routes.SETTINGS.SECURITY_SETTINGS);
        },
        closeOnPrimaryButtonPress: true,
      },
    });
  }, [navigation]);

  const handleSeedlessPasswordOutdated = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: strings('login.seedless_password_outdated_modal_title'),
        description: strings('login.seedless_password_outdated_modal_content'),
        primaryButtonLabel: strings(
          'login.seedless_password_outdated_modal_confirm',
        ),
        type: 'error',
        icon: IconName.Danger,
        isInteractable: false,
        onPrimaryButtonPress: async () => {
          await Authentication.lockApp({ locked: true }).catch((lockError) => {
            Logger.error(lockError);
            handleSeedlessChangePasswordError();
          });
        },
        closeOnPrimaryButtonPress: true,
      },
    });
  }, [navigation, handleSeedlessChangePasswordError]);

  const recreateVault = useCallback(
    async (verifiedPassword: string) => {
      await recreateVaultsWithNewPassword(
        verifiedPassword,
        password,
        selectedAddress || '',
      );
    },
    [password, selectedAddress],
  );

  const onPressCreate = useCallback(async () => {
    if (loading) return;
    if (!passwordRequirementsMet(password)) {
      Alert.alert('Error', strings('choose_password.password_length_error'));
      return;
    } else if (password !== confirmPassword) {
      Alert.alert('Error', strings('choose_password.password_dont_match'));
      return;
    }

    try {
      setLoading(true);

      const isGlobalPasswordOutdated =
        await Authentication.checkIsSeedlessPasswordOutdated();
      if (isGlobalPasswordOutdated) {
        setLoading(false);
        handleSeedlessPasswordOutdated();
        return;
      }

      const verifiedPassword =
        originalPassword ?? (await reauthenticate(currentPassword));
      if (!verifiedPassword) {
        setLoading(false);
        return;
      }

      await recreateVault(verifiedPassword);
      await Authentication.resetPassword();

      try {
        const authData = await Authentication.componentAuthenticationType(
          biometryChoice,
          rememberMe,
        );
        await Authentication.storePassword(
          password,
          authData.currentAuthType,
          true,
        );
      } catch (storeError) {
        Logger.error(storeError as Error);
      }

      dispatch(setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT));
      dispatch(passwordSet());

      const eventBuilder = AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PASSWORD_CHANGED,
      ).addProperties({
        biometry_type: biometryType,
        biometrics_enabled: Boolean(biometryChoice),
      });
      analytics.trackEvent(eventBuilder.build());

      setLoading(false);
      navigation.navigate(Routes.SETTINGS.SECURITY_SETTINGS);
      InteractionManager.runAfterInteractions(() => {
        NotificationManager.showSimpleNotification({
          status: 'success',
          duration: 5000,
          title: strings('reset_password.password_updated'),
          description: strings('reset_password.successfully_changed'),
        });
      });
    } catch (err) {
      const castError = err as Error;
      if (castError.toString() === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          strings('choose_password.security_alert_title'),
          strings('choose_password.security_alert_message'),
        );
        setLoading(false);
      } else if (castError.message.includes('SeedlessOnboardingController')) {
        Logger.error(castError);
        if (
          castError.message ===
          SeedlessOnboardingControllerErrorMessage.OutdatedPassword
        ) {
          handleSeedlessPasswordOutdated();
        } else {
          handleSeedlessChangePasswordError();
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [
    loading,
    password,
    currentPassword,
    confirmPassword,
    originalPassword,
    biometryChoice,
    rememberMe,
    biometryType,
    recreateVault,
    reauthenticate,
    handleSeedlessPasswordOutdated,
    handleSeedlessChangePasswordError,
    dispatch,
    navigation,
  ]);

  const jumpToConfirmPassword = useCallback(() => {
    confirmPasswordInput.current?.focus();
  }, []);

  const toggleShowPassword = useCallback((index: number) => {
    setShowPasswordIndex((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }, []);

  const onPasswordChange = useCallback((val: string) => {
    setPassword(val);
    setConfirmPassword((prev) => (val === '' ? '' : prev));
  }, []);

  const onCurrentPasswordChange = useCallback((val: string) => {
    setCurrentPassword(val);
    setWarningIncorrectPassword(undefined);
  }, []);

  const learnMore = useCallback(() => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: isSeedlessOnboardingLoginFlow
          ? PASSWORD_GUIDE_URL
          : RESET_PASSWORD_GUIDE_URL,
        title: 'support.metamask.io',
      },
    });
  }, [navigation, isSeedlessOnboardingLoginFlow]);

  const learnMoreSocialLogin = useCallback(() => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: RESET_PASSWORD_SOCIAL_LOGIN_URL,
        title: 'support.metamask.io',
      },
    });
  }, [navigation]);

  const isError = useCallback(
    () =>
      password !== '' && confirmPassword !== '' && password !== confirmPassword,
    [password, confirmPassword],
  );

  const isPasswordTooShort = useCallback(
    () =>
      !isPasswordFieldFocused &&
      !!password &&
      password.length < MIN_PASSWORD_LENGTH,
    [isPasswordFieldFocused, password],
  );

  const handleConfirmAction = useCallback(() => {
    NavigationService.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: strings('reset_password.warning_password_change_title'),
        description: isSeedlessOnboardingLoginFlow ? (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {strings('reset_password.warning_password_change_description')}{' '}
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.PrimaryDefault}
              onPress={learnMoreSocialLogin}
            >
              {strings('reset_password.learn_more')}
            </Text>
          </Text>
        ) : (
          `${strings('reset_password.warning_password_change_description')}.`
        ),
        type: 'error',
        icon: IconName.Danger,
        secondaryButtonLabel: strings(
          'reset_password.warning_password_cancel_button',
        ),
        primaryButtonLabel: strings(
          'reset_password.warning_password_change_button',
        ),
        onPrimaryButtonPress: onPressCreate,
        closeOnPrimaryButtonPress: true,
      },
    });
  }, [isSeedlessOnboardingLoginFlow, learnMoreSocialLogin, onPressCreate]);

  const handlePasswordRecoveryAcknowledgement = useCallback(() => {
    const isSrp =
      authConnection !== AuthConnection.Apple &&
      authConnection !== AuthConnection.Google &&
      authConnection !== AuthConnection.Telegram;

    NavigationService.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: strings('reset_password.warning_password_change_title'),
        description: (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {isSrp
              ? strings('reset_password.i_understand')
              : strings('reset_password.checkbox_forgot_password')}{' '}
            <Text
              onPress={learnMore}
              testID={ChoosePasswordSelectorsIDs.LEARN_MORE_LINK_ID}
              variant={TextVariant.BodyMd}
              color={TextColor.PrimaryDefault}
            >
              {strings('reset_password.learn_more')}
            </Text>
          </Text>
        ),
        type: 'error',
        icon: IconName.Danger,
        secondaryButtonLabel: strings(
          'reset_password.warning_password_cancel_button',
        ),
        primaryButtonLabel: strings('send.i_understand'),
        buttonLayout: 'vertical',
        onPrimaryButtonPress: isSeedlessOnboardingLoginFlow
          ? handleConfirmAction
          : onPressCreate,
        closeOnPrimaryButtonPress: true,
      },
    });
  }, [
    authConnection,
    handleConfirmAction,
    isSeedlessOnboardingLoginFlow,
    learnMore,
    onPressCreate,
  ]);

  const renderPasswordHelperText = () => {
    if (password && password.length >= MIN_PASSWORD_LENGTH) return null;
    const showError = isPasswordTooShort();
    return (
      <Text
        variant={TextVariant.BodySm}
        color={showError ? TextColor.ErrorDefault : TextColor.TextAlternative}
      >
        {strings('reset_password.must_be_at_least', {
          number: MIN_PASSWORD_LENGTH,
        })}
      </Text>
    );
  };

  const renderErrorText = () => {
    if (!isError()) return null;
    return (
      <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
        {strings('choose_password.password_error')}
      </Text>
    );
  };

  const renderWarningText = (warningText?: string) => {
    if (!warningText) return null;
    return (
      <Text color={TextColor.ErrorDefault} style={tw.style('py-[10px]')}>
        {warningText}
      </Text>
    );
  };

  const renderLoadingState = () => (
    <Box
      alignItems={BoxAlignItems.Center}
      paddingHorizontal={10}
      twClassName="flex-1 pb-[30px]"
    >
      <Box
        twClassName={`mt-[30px] mb-[30px] ${
          Device.isIos() ? 'w-[90px] h-[90px]' : 'w-20 h-20'
        }`}
      >
        <LottieView
          style={tw.style('self-center w-20 h-20')}
          autoPlay
          loop
          source={SearchingFox as AnimationObject}
          resizeMode="contain"
        />
      </Box>
      <ActivityIndicator size="large" color={colors.icon.default} />
      <Text
        variant={TextVariant.HeadingLg}
        style={tw.style('mt-5 mb-5 text-center w-full')}
      >
        {strings('reset_password.changing_password')}
      </Text>
      <Text
        variant={TextVariant.BodyLg}
        fontWeight={FontWeight.Medium}
        style={tw.style('leading-[23px] text-center')}
      >
        {strings('reset_password.changing_password_subtitle')}
      </Text>
    </Box>
  );

  const renderSwitch = () => (
    <LoginOptionsSwitch
      shouldRenderBiometricOption={biometryType}
      biometryChoiceState={biometryChoice}
      onUpdateBiometryChoice={setBiometryChoice}
      onUpdateRememberMe={setRememberMe}
    />
  );

  const renderResetPassword = () => {
    const passwordsMatch = password !== '' && password === confirmPassword;
    const hasCurrentPassword =
      originalPassword !== null || currentPassword !== '';
    const canSubmit =
      hasCurrentPassword &&
      passwordsMatch &&
      password.length >= MIN_PASSWORD_LENGTH;
    const isSrp =
      authConnection !== AuthConnection.Apple &&
      authConnection !== AuthConnection.Google &&
      authConnection !== AuthConnection.Telegram;

    return (
      <Box
        backgroundColor={BoxBackgroundColor.BackgroundDefault}
        twClassName="flex-1"
      >
        {loading ? (
          renderLoadingState()
        ) : (
          <KeyboardAwareScrollView
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style('flex-grow px-4 pt-2 pb-6')}
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            resetScrollToCoords={{ x: 0, y: 0 }}
          >
            <Box twClassName="flex-1 flex-col">
              <Box
                testID={ChoosePasswordSelectorsIDs.CONTAINER_ID}
                flexDirection={BoxFlexDirection.Column}
                gap={4}
                twClassName="grow"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {isSrp
                    ? strings('choose_password.description')
                    : strings('choose_password.description_social_login')}
                </Text>

                {/* Current password field */}
                <Box twClassName="relative flex-col gap-2">
                  <Label
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    style={tw.style('-mb-1')}
                  >
                    {strings('manual_backup_step_1.enter_current_password')}
                  </Label>
                  <TextField
                    placeholder={strings('password_reset.password_title')}
                    onChangeText={onCurrentPasswordChange}
                    value={currentPassword}
                    inputProps={{
                      secureTextEntry: true,
                      testID:
                        ChoosePasswordSelectorsIDs.CURRENT_PASSWORD_INPUT_ID,
                      returnKeyType: 'next',
                      autoComplete: 'password',
                      autoCapitalize: 'none',
                      keyboardAppearance: themeAppearance,
                    }}
                  />
                  {renderWarningText(warningIncorrectPassword)}
                </Box>

                {/* New password field */}
                <Box twClassName="relative flex-col gap-2">
                  <Label
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    style={tw.style('-mb-1')}
                  >
                    {strings('reset_password.password')}
                  </Label>
                  <TextField
                    value={password}
                    onChangeText={onPasswordChange}
                    onFocus={() => setIsPasswordFieldFocused(true)}
                    onBlur={() => setIsPasswordFieldFocused(false)}
                    placeholder={strings(
                      'reset_password.new_password_placeholder',
                    )}
                    isError={isPasswordTooShort()}
                    endAccessory={
                      <TouchableOpacity onPress={() => toggleShowPassword(0)}>
                        <Icon
                          name={
                            showPasswordIndex.includes(0)
                              ? IconName.Eye
                              : IconName.EyeSlash
                          }
                          size={IconSize.Lg}
                          color={IconColor.IconAlternative}
                          testID={
                            ChoosePasswordSelectorsIDs.NEW_PASSWORD_SHOW_ICON_ID
                          }
                        />
                      </TouchableOpacity>
                    }
                    inputProps={{
                      secureTextEntry: showPasswordIndex.includes(0),
                      testID: ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
                      onSubmitEditing: jumpToConfirmPassword,
                      returnKeyType: 'next',
                      autoComplete: 'password-new',
                      autoCapitalize: 'none',
                      keyboardAppearance: themeAppearance,
                    }}
                  />
                  {renderPasswordHelperText()}
                </Box>

                {/* Confirm password field */}
                <Box twClassName="relative flex-col gap-2">
                  <Label
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    style={tw.style('-mb-1')}
                  >
                    {strings('reset_password.confirm_password')}
                  </Label>
                  <TextField
                    inputRef={confirmPasswordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={strings(
                      'reset_password.confirm_password_placeholder',
                    )}
                    endAccessory={
                      <TouchableOpacity onPress={() => toggleShowPassword(1)}>
                        <Icon
                          name={
                            showPasswordIndex.includes(1)
                              ? IconName.Eye
                              : IconName.EyeSlash
                          }
                          size={IconSize.Lg}
                          color={IconColor.IconAlternative}
                          testID={
                            ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_SHOW_ICON_ID
                          }
                        />
                      </TouchableOpacity>
                    }
                    inputProps={{
                      secureTextEntry: showPasswordIndex.includes(1),
                      testID:
                        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
                      returnKeyType: 'done',
                      autoComplete: 'password-new',
                      autoCapitalize: 'none',
                      keyboardAppearance: themeAppearance,
                    }}
                  />
                  {renderErrorText()}
                </Box>

                <Box
                  flexDirection={BoxFlexDirection.Column}
                  twClassName={`w-full gap-[18px] mt-auto ${
                    Platform.OS === 'android' ? 'mb-6' : 'mb-4'
                  }`}
                >
                  {renderSwitch()}
                  <Button
                    {...getCommonButtonProps()}
                    onPress={handlePasswordRecoveryAcknowledgement}
                    testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
                    isDisabled={!canSubmit}
                  >
                    {strings('reset_password.confirm_btn')}
                  </Button>
                </Box>
              </Box>
            </Box>
          </KeyboardAwareScrollView>
        )}
      </Box>
    );
  };

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        testID="header"
        title={strings('password_reset.change_password')}
        onBack={() => navigation.goBack()}
        backButtonProps={{ isDisabled: loading }}
        includesTopInset
      />
      <Box twClassName="flex-1" testID={'account-backup-step-4-screen'}>
        {renderResetPassword()}
      </Box>
    </SafeAreaView>
  );
};

export default ResetPassword;
