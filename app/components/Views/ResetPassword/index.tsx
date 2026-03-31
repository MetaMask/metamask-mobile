import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  InteractionManager,
  TouchableOpacity,
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
  Checkbox,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import StorageWrapper from '../../../store/storage-wrapper';
import { useSelector, useDispatch } from 'react-redux';
import { passwordSet } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import { strings } from '../../../../locales/i18n';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
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
import {
  AuthConnection,
  SeedlessOnboardingControllerErrorMessage,
} from '@metamask/seedless-onboarding-controller';
import { ReauthenticateErrorType } from '../../../core/Authentication/types';
import Device from '../../../util/device';
import SearchingFox from '../../../animations/Searching_Fox.json';

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';
enum ViewState {
  ResetForm = 'reset_form',
  ConfirmCurrent = 'confirm_current',
}

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

  const [isSelected, setIsSelected] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [biometryType, setBiometryType] = useState<string | null>(null);
  const [biometryChoice, setBiometryChoice] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState(ViewState.ConfirmCurrent);
  const [originalPassword, setOriginalPassword] = useState<string | null>(null);
  const [ready, setReady] = useState(true);
  const [showPasswordIndex, setShowPasswordIndex] = useState<number[]>([0, 1]);
  const [isPasswordFieldFocused, setIsPasswordFieldFocused] = useState(false);
  const [warningIncorrectPassword, setWarningIncorrectPassword] = useState<
    string | undefined
  >(undefined);

  const confirmPasswordInput = useRef<React.ElementRef<
    typeof TextField
  > | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reauthenticate = useCallback(async (pwd?: string) => {
    setReady(false);
    try {
      const { password: verifiedPassword } =
        await Authentication.reauthenticate(pwd);
      setPassword('');
      setOriginalPassword(verifiedPassword);
      setReady(true);
      setView(ViewState.ResetForm);
    } catch (e) {
      const err = e as Error;
      if (
        err.message.includes(
          ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS,
        )
      ) {
        return;
      }
      setWarningIncorrectPassword(
        strings('reveal_credential.warning_incorrect_password'),
      );
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const authData = await Authentication.getType();
        const previouslyDisabled = await StorageWrapper.getItem(
          BIOMETRY_CHOICE_DISABLED,
        );
        const passcodePreviouslyDisabled =
          await StorageWrapper.getItem(PASSCODE_DISABLED);

        if (
          authData.currentAuthType === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION
        ) {
          setBiometryType(passcodeType(authData.currentAuthType));
          setBiometryChoice(
            !(
              passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE
            ),
          );
        } else if (authData.availableBiometryType) {
          setBiometryType(authData.availableBiometryType);
          setBiometryChoice(
            !(previouslyDisabled && previouslyDisabled === TRUE),
          );
          reauthenticate();
        }
      } catch (e) {
        Logger.error(e as Error);
      } finally {
        setView(ViewState.ConfirmCurrent);
      }
    };

    initAuth();
  }, [reauthenticate]);

  const toggleSelection = useCallback(() => {
    setIsSelected((prev) => !prev);
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

  const recreateVault = useCallback(async () => {
    await recreateVaultsWithNewPassword(
      originalPassword || '',
      password,
      selectedAddress || '',
    );
  }, [originalPassword, password, selectedAddress]);

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

      await recreateVault();
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
    confirmPassword,
    biometryChoice,
    rememberMe,
    biometryType,
    recreateVault,
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

  const learnMore = useCallback(() => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: isSeedlessOnboardingLoginFlow
          ? 'https://support.metamask.io/configure/wallet/passwords-and-metamask/'
          : 'https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/',
        title: 'support.metamask.io',
      },
    });
  }, [navigation, isSeedlessOnboardingLoginFlow]);

  const learnMoreSocialLogin = useCallback(() => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/configure/wallet/how-can-i-reset-my-password/',
        title: 'support.metamask.io',
      },
    });
  }, [navigation]);

  const reauthenticateWithPassword = useCallback(() => {
    reauthenticate(password);
  }, [reauthenticate, password]);

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

  const renderLoader = () => (
    <Box
      alignItems={BoxAlignItems.Center}
      paddingHorizontal={10}
      twClassName="flex-1 pb-[30px]"
    >
      <ActivityIndicator size="small" />
    </Box>
  );

  const renderConfirmPassword = () => (
    <KeyboardAvoidingView
      style={tw.style('flex-1 flex-row self-center h-full')}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <KeyboardAwareScrollView
        style={tw.style('flex-1 h-full')}
        enableOnAndroid
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          justifyContent={BoxJustifyContent.Between}
          padding={4}
          twClassName="flex-1 gap-y-4 h-full"
        >
          <Box alignItems={BoxAlignItems.Start} twClassName="flex-1 h-full">
            <Label
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              style={tw.style('mb-1')}
            >
              {strings('manual_backup_step_1.enter_current_password')}
            </Label>
            <TextField
              placeholder={strings('password_reset.password_title')}
              onChangeText={onPasswordChange}
              secureTextEntry
              value={password}
              onSubmitEditing={reauthenticateWithPassword}
              testID={ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID}
              keyboardAppearance={themeAppearance}
              autoComplete="password"
            />
            {renderWarningText(warningIncorrectPassword)}
          </Box>
          <Box justifyContent={BoxJustifyContent.End} twClassName="flex-1">
            <Button
              {...getCommonButtonProps()}
              onPress={reauthenticateWithPassword}
              testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
              isDisabled={!password}
            >
              {strings('manual_backup_step_1.confirm')}
            </Button>
          </Box>
        </Box>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );

  const renderResetPassword = () => {
    const passwordsMatch = password !== '' && password === confirmPassword;
    const canSubmit =
      passwordsMatch && isSelected && password.length >= MIN_PASSWORD_LENGTH;
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
            style={tw.style('flex-1 px-4')}
            contentContainerStyle={tw.style('flex-grow')}
            resetScrollToCoords={{ x: 0, y: 0 }}
          >
            <Box twClassName="flex-1 flex-col">
              <Box
                testID={ChoosePasswordSelectorsIDs.CONTAINER_ID}
                flexDirection={BoxFlexDirection.Column}
                gap={4}
                twClassName="grow pt-4"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {isSrp
                    ? strings('choose_password.description')
                    : strings('choose_password.description_social_login')}
                </Text>

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
                    secureTextEntry={showPasswordIndex.includes(0)}
                    placeholder={strings(
                      'reset_password.new_password_placeholder',
                    )}
                    testID={ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID}
                    onSubmitEditing={jumpToConfirmPassword}
                    returnKeyType="next"
                    autoComplete="password-new"
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
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
                    ref={confirmPasswordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={showPasswordIndex.includes(1)}
                    placeholder={strings(
                      'reset_password.confirm_password_placeholder',
                    )}
                    testID={
                      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID
                    }
                    returnKeyType={'done'}
                    autoComplete="password-new"
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
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
                  />
                  {renderErrorText()}
                </Box>

                {/* I understand checkbox */}
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Start}
                  justifyContent={BoxJustifyContent.Start}
                  marginBottom={4}
                  marginTop={2}
                  gap={2}
                >
                  <Checkbox
                    onChange={toggleSelection}
                    isSelected={isSelected}
                    testID={ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID}
                    accessibilityLabel={
                      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID
                    }
                    style={tw.style('flex items-start')}
                  />
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextDefault}
                    testID={ChoosePasswordSelectorsIDs.CHECKBOX_TEXT_ID}
                    onPress={toggleSelection}
                    twClassName="flex-row items-center w-[90%]"
                  >
                    {isSrp
                      ? strings('reset_password.i_understand')
                      : strings('reset_password.checkbox_forgot_password')}
                    <Text
                      onPress={learnMore}
                      testID={ChoosePasswordSelectorsIDs.LEARN_MORE_LINK_ID}
                      variant={TextVariant.BodyMd}
                      color={TextColor.PrimaryDefault}
                    >
                      {' ' + strings('reset_password.learn_more')}
                    </Text>
                  </Text>
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
                    onPress={() => {
                      if (isSeedlessOnboardingLoginFlow) {
                        handleConfirmAction();
                      } else {
                        onPressCreate();
                      }
                    }}
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

  if (!ready) return renderLoader();

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderCompactStandard
        title={strings('password_reset.change_password')}
        onBack={() => navigation.goBack()}
        backButtonProps={{ isDisabled: loading }}
        includesTopInset
      />
      <Box twClassName="flex-1" testID={'account-backup-step-4-screen'}>
        {view === ViewState.ResetForm
          ? renderResetPassword()
          : renderConfirmPassword()}
      </Box>
    </SafeAreaView>
  );
};

export default ResetPassword;
