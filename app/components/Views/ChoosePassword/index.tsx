import React, {
  Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  View,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StorageWrapper from '../../../store/storage-wrapper';
import { connect } from 'react-redux';
import {
  passwordSet as passwordSetAction,
  passwordUnset as passwordUnsetAction,
  seedphraseNotBackedUp as seedphraseNotBackedUpAction,
} from '../../../actions/user';
import { setLockTime as setLockTimeAction } from '../../../actions/settings';
import Engine from '../../../core/Engine';
import Device from '../../../util/device';
import {
  passcodeType,
  updateAuthTypeStorageFlags,
} from '../../../util/authentication';
import { strings } from '../../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import AppConstants from '../../../core/AppConstants';
import zxcvbn from 'zxcvbn';
import Logger from '../../../util/Logger';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../constants/navigation';
import {
  EXISTING_USER,
  TRUE,
  SEED_PHRASE_HINTS,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import {
  getPasswordStrengthWord,
  passwordRequirementsMet,
  MIN_PASSWORD_LENGTH,
} from '../../../util/password';

import { MetaMetricsEvents } from '../../../core/Analytics';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { ThemeContext, useTheme } from '../../../util/theme';

import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import navigateTermsOfUse from '../../../util/termsOfUse/termsOfUse';
import { ChoosePasswordSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ChoosePassword.selectors';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Checkbox from '../../../component-library/components/Checkbox';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import TextField from '../../../component-library/components/Form/TextField/TextField';
import Label from '../../../component-library/components/Form/Label';
import { TextFieldSize } from '../../../component-library/components/Form/TextField';
import fox from '../../../animations/Searching_Fox.json';
import LottieView from 'lottie-react-native';
import { saveOnboardingEvent } from '../../../actions/onboarding';
import { Colors } from '../../../util/theme/models';
import {
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { RootState } from '../../../reducers';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
} from '../../../core/Analytics/MetaMetrics.types';
import { AnyAction } from 'redux';
import usePrevious from '../../hooks/usePrevious/usePrevious';
import { AccountImportStrategy } from '@metamask/keyring-controller';
import { AuthData } from '../../../core/Authentication/Authentication';
import { uint8ArrayToMnemonic } from '../../../util/mnemonic';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
    },
    scrollableWrapper: {
      flex: 1,
      paddingHorizontal: 16,
    },
    keyboardScrollableWrapper: {
      flexGrow: 1,
    },
    loadingWrapper: {
      paddingHorizontal: 40,
      paddingBottom: 30,
      alignItems: 'center',
      flex: 1,
    },
    foxWrapper: {
      width: Device.isIos() ? 90 : 80,
      height: Device.isIos() ? 90 : 80,
      marginTop: 30,
      marginBottom: 30,
    },
    image: {
      alignSelf: 'center',
      width: 80,
      height: 80,
    },
    title: {
      justifyContent: 'flex-start',
      textAlign: 'left',
      fontSize: 32,
    },
    subtitle: {
      textAlign: 'center',
    },
    field: {
      position: 'relative',
      flexDirection: 'column',
      gap: 8,
    },
    ctaWrapper: {
      flex: 1,
      marginTop: 20,
      width: '100%',
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_weak: {
      color: colors.error.default,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_good: {
      color: colors.primary.default,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_strong: {
      color: colors.success.default,
    },
    learnMoreContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      gap: 8,
      marginTop: 8,
      marginBottom: 16,
    },
    learnMoreTextContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      gap: 1,
      width: '100%',
      flexWrap: 'wrap',
    },
    headerLeft: {
      marginLeft: 16,
    },
    headerRight: {
      marginRight: 16,
    },
    passwordContainer: {
      flexDirection: 'column',
      gap: 16,
      marginVertical: 16,
    },
    label: {
      marginBottom: -4,
    },
    checkbox: {
      alignItems: 'flex-start',
    },
  });

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

interface HeaderLeftProps {
  colors: Colors;
  marginLeft?: number;
}

const HeaderLeft = ({ colors, marginLeft = 16 }: HeaderLeftProps) => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Icon
        name={IconName.ArrowLeft}
        size={IconSize.Lg}
        color={colors.text.default}
        style={{ marginLeft }}
      />
    </TouchableOpacity>
  );
};

const headerLeft = (colors: Colors, marginLeft: number) => {
  return <HeaderLeft colors={colors} marginLeft={marginLeft} />;
};

interface LoginOptionsSwitchComponentProps {
  biometryType: string | null;
  biometryChoice: boolean;
  updateBiometryChoice: (biometryChoice: boolean) => void;
  setRememberMe: (rememberMe: boolean) => void;
}

const LoginOptionsSwitchComponent = (
  props: LoginOptionsSwitchComponentProps,
) => {
  const { biometryType, biometryChoice, updateBiometryChoice, setRememberMe } =
    props;
  const handleUpdateRememberMe = (rememberMe: boolean) => {
    setRememberMe(rememberMe);
  };
  return (
    <LoginOptionsSwitch
      shouldRenderBiometricOption={biometryType}
      biometryChoiceState={biometryChoice}
      onUpdateBiometryChoice={updateBiometryChoice}
      onUpdateRememberMe={handleUpdateRememberMe}
    />
  );
};

/**
 * Returns current vault seed phrase
 * It does it using an empty password or a password set by the user
 * depending on the state the app is currently in
 */
const getSeedPhrase = async (
  password: string,
  isKeyringControllerPasswordSet: boolean,
) => {
  const { KeyringController } = Engine.context;
  const keychainPassword = isKeyringControllerPasswordSet ? password : '';
  const seed = await KeyringController.exportSeedPhrase(keychainPassword);
  return uint8ArrayToMnemonic(seed, wordlist);
};

interface ChoosePasswordProps {
  passwordSet: () => void;
  passwordUnset: () => void;
  setLockTime: (time: number) => void;
  seedphraseNotBackedUp: () => void;
  dispatchSaveOnboardingEvent: (event: ITrackingEvent) => void;
}
/**
 * View where users can set their password for the first time
 */
const ChoosePassword = (props: ChoosePasswordProps) => {
  const {
    passwordSet,
    passwordUnset,
    setLockTime,
    seedphraseNotBackedUp,
    dispatchSaveOnboardingEvent,
  } = props;
  const navigation = useNavigation();
  const route = useRoute();

  const { colors, themeAppearance } = useTheme();

  const [isSelected, setIsSelected] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [biometryType, setBiometryType] = useState<string | null>(null);
  const [biometryChoice, setBiometryChoice] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inputWidth, setInputWidth] = useState({ width: '99%' });
  const [showPasswordIndex, setShowPasswordIndex] = useState([0, 1]);

  const [passwordStrength, setPasswordStrength] = useState(0);

  // const [
  //   passwordInputContainerFocusedIndex,
  //   setPasswordInputContainerFocusedIndex,
  // ] = useState(-1);

  const confirmPasswordInput = useRef<TextInput>(null);
  // Flag to know if password in keyring was set or not
  const [isKeyringControllerPasswordSet, setIsKeyringControllerPasswordSet] =
    useState(false);

  const track = (event: IMetaMetricsEvent, properties?: JsonMap) => {
    const eventBuilder = MetricsEventBuilder.createEventBuilder(event);
    if (properties) {
      eventBuilder.addProperties(properties);
    }
    trackOnboarding(eventBuilder.build(), dispatchSaveOnboardingEvent);
  };

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getOnboardingNavbarOptions(
        route,
        {
          headerLeft: () => headerLeft(colors, 16),
          headerRight: () => <View />,
        },
        colors,
        false,
      ),
    );
  }, [navigation, route, colors]);

  const termsOfUse = useCallback(async () => {
    if (navigation) {
      await navigateTermsOfUse(navigation.navigate);
    }
  }, [navigation]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  useEffect(() => {
    termsOfUse();
  }, [termsOfUse]);

  useEffect(() => {
    const componentDidMount = async () => {
      const authData = await Authentication.getType();
      const previouslyDisabled = await StorageWrapper.getItem(
        BIOMETRY_CHOICE_DISABLED,
      );
      const passcodePreviouslyDisabled = await StorageWrapper.getItem(
        PASSCODE_DISABLED,
      );
      if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE) {
        setBiometryType(passcodeType(authData.currentAuthType));
        setBiometryChoice(
          !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE),
        );
      } else if (authData.availableBiometryType) {
        setBiometryType(authData.availableBiometryType);
        setBiometryChoice(!(previouslyDisabled && previouslyDisabled === TRUE));
      }
      setTimeout(() => {
        setInputWidth({ width: '100%' });
      }, 100);
    };
    componentDidMount();
  }, []);

  const prevLoading = usePrevious(loading);

  useEffect(() => {
    updateNavBar();
    if (!prevLoading && loading) {
      // update navigationOptions
      navigation.setParams({
        headerLeft: <View />,
      });
    }
  }, [loading, navigation, prevLoading, updateNavBar]);

  /**
   * This function handles the case when the user rejects the OS prompt for allowing use of biometrics.
   * If this occurs we will create the wallet automatically with password as the login method
   */
  const handleRejectedOsBiometricPrompt = async () => {
    const newAuthData = await Authentication.componentAuthenticationType(
      false,
      false,
    );
    try {
      await Authentication.newWalletAndKeychain(password, newAuthData);
    } catch (err) {
      throw Error(strings('choose_password.disable_biometric_error'));
    }
    setBiometryType(newAuthData.availableBiometryType || null);
    setBiometryChoice(false);
  };

  /**
   * Recreates a vault
   *
   * @param newPassword - Password to recreate and set the vault with
   */
  const recreateVault = async (newPassword: string, authType: AuthData) => {
    const { KeyringController } = Engine.context;
    const seedPhrase = await getSeedPhrase(
      newPassword,
      isKeyringControllerPasswordSet,
    );
    let importedAccounts: string[] = [];
    try {
      const keychainPassword = isKeyringControllerPasswordSet
        ? newPassword
        : '';
      // Get imported accounts
      const simpleKeyrings = KeyringController.state.keyrings.filter(
        (keyring) => keyring.type === 'Simple Key Pair',
      );
      for (const simpleKeyring of simpleKeyrings) {
        const simpleKeyringAccounts = await Promise.all(
          simpleKeyring.accounts.map((account) =>
            KeyringController.exportAccount(keychainPassword, account),
          ),
        );
        importedAccounts = [...importedAccounts, ...simpleKeyringAccounts];
      }
    } catch (e) {
      Logger.error(
        e as Error,
        'error while trying to get imported accounts on recreate vault',
      );
    }

    // Recreate keyring with password given to this method
    await Authentication.newWalletAndRestore(
      newPassword,
      authType,
      seedPhrase,
      true,
    );
    // Keyring is set with empty password or not
    setIsKeyringControllerPasswordSet(newPassword !== '');

    // Get props to restore vault
    const hdKeyring = KeyringController.state.keyrings[0];
    const existingAccountCount = hdKeyring.accounts.length;

    // Create previous accounts again
    for (let i = 0; i < existingAccountCount - 1; i++) {
      await KeyringController.addNewAccount();
    }

    try {
      // Import imported accounts again
      for (const account of importedAccounts) {
        await KeyringController.importAccountWithStrategy(
          AccountImportStrategy.privateKey,
          [account],
        );
      }
    } catch (e) {
      Logger.error(
        e as Error,
        'error while trying to import accounts on recreate vault',
      );
    }
  };

  const onPressCreate = async () => {
    const passwordsMatch = password !== '' && password === confirmPassword;
    const canSubmit = passwordsMatch && isSelected;

    if (!canSubmit) return;
    if (loading) return;
    if (!passwordRequirementsMet(password)) {
      Alert.alert('Error', strings('choose_password.password_length_error'));
      return;
    } else if (password !== confirmPassword) {
      Alert.alert('Error', strings('choose_password.password_dont_match'));
      return;
    }
    track(MetaMetricsEvents.WALLET_CREATION_ATTEMPTED);

    try {
      setLoading(true);
      const routeParams = route.params as { [key: string]: string } | undefined;
      const previous_screen = routeParams?.[PREVIOUS_SCREEN];

      const authType = await Authentication.componentAuthenticationType(
        biometryChoice,
        rememberMe,
      );

      if (previous_screen === ONBOARDING) {
        try {
          await Authentication.newWalletAndKeychain(password, authType);
        } catch (error) {
          if (Device.isIos()) await handleRejectedOsBiometricPrompt();
        }
        setIsKeyringControllerPasswordSet(true);
        seedphraseNotBackedUp();
      } else {
        await recreateVault(password, authType);
      }

      passwordSet();
      setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
      setLoading(false);

      navigation.dispatch(StackActions.replace('AccountBackupStep1'));

      track(MetaMetricsEvents.WALLET_CREATED, {
        biometrics_enabled: Boolean(biometryType),
      });
      track(MetaMetricsEvents.WALLET_SETUP_COMPLETED, {
        wallet_setup_type: 'new',
        new_wallet: true,
      });
    } catch (error) {
      try {
        await recreateVault('', {
          currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
        });
      } catch (e) {
        Logger.error(e as Error);
      }
      // Set state in app as it was with no password
      await StorageWrapper.setItem(EXISTING_USER, TRUE);
      await StorageWrapper.removeItem(SEED_PHRASE_HINTS);
      passwordUnset();
      setLockTime(-1);
      // Should we force people to enable passcode / biometrics?
      if ((error as Error).toString() === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          strings('choose_password.security_alert_title'),
          strings('choose_password.security_alert_message'),
        );
        setLoading(false);
      } else {
        setLoading(false);
        setErrorMsg((error as Error).toString());
      }
      track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
        wallet_setup_type: 'new',
        error_type: (error as Error).toString(),
      });
    }
  };

  const jumpToConfirmPassword = () => {
    confirmPasswordInput.current?.focus();
  };

  const updateBiometryChoice = useCallback(
    async (newBiometryChoice: boolean) => {
      await updateAuthTypeStorageFlags(newBiometryChoice);
      setBiometryChoice(newBiometryChoice);
    },
    [],
  );

  const onPasswordChange = useCallback((val: string) => {
    const passInfo = zxcvbn(val);
    setPassword(val);
    setPasswordStrength(passInfo.score);
  }, []);

  const learnMore = useCallback(() => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/',
        title: 'support.metamask.io',
      },
    });
  }, [navigation]);

  const toggleShowPassword = useCallback((index: number) => {
    setShowPasswordIndex((prevState) => {
      const newShowPasswordIndex = prevState.includes(index)
        ? prevState.filter((i) => i !== index)
        : [...prevState, index];
      return newShowPasswordIndex;
    });
  }, []);

  const checkError = useCallback(
    () =>
      password !== '' && confirmPassword !== '' && password !== confirmPassword,
    [password, confirmPassword],
  );

  const passwordsMatch = password !== '' && password === confirmPassword;
  const canSubmit = passwordsMatch && isSelected;

  const routeParams = route.params as { [key: string]: string } | undefined;
  const previousScreen = routeParams?.[PREVIOUS_SCREEN];

  const passwordStrengthWord = useMemo(
    () => getPasswordStrengthWord(passwordStrength),
    [passwordStrength],
  );

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.mainWrapper}>
      {loading ? (
        <View style={styles.loadingWrapper}>
          <View style={styles.foxWrapper}>
            <LottieView
              style={styles.image}
              autoPlay
              loop
              source={fox}
              resizeMode="contain"
            />
          </View>
          <ActivityIndicator size="large" color={colors.text.default} />
          <Text
            variant={TextVariant.HeadingLG}
            style={styles.title}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {strings(
              previousScreen === ONBOARDING
                ? 'create_wallet.title'
                : 'secure_your_wallet.creating_password',
            )}
          </Text>
          <Text variant={TextVariant.HeadingSMRegular} style={styles.subtitle}>
            {strings('create_wallet.subtitle')}
          </Text>
        </View>
      ) : (
        <View style={styles.wrapper}>
          <KeyboardAwareScrollView
            style={styles.scrollableWrapper}
            contentContainerStyle={styles.keyboardScrollableWrapper}
            resetScrollToCoords={{ x: 0, y: 0 }}
          >
            <View testID={ChoosePasswordSelectorsIDs.CONTAINER_ID}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('choose_password.steps', {
                  currentStep: 1,
                  totalSteps: 3,
                })}
              </Text>

              <Text variant={TextVariant.DisplayMD} color={TextColor.Default}>
                {strings('choose_password.title')}
              </Text>

              <View style={styles.passwordContainer}>
                <View style={styles.field}>
                  <Label
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Default}
                    style={styles.label}
                  >
                    {strings('choose_password.password')}
                  </Label>
                  <TextField
                    placeholder={strings(
                      'import_from_seed.enter_strong_password',
                    )}
                    secureTextEntry={showPasswordIndex.includes(0)}
                    value={password}
                    onChangeText={onPasswordChange}
                    placeholderTextColor={colors.text.muted}
                    testID={ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID}
                    onSubmitEditing={jumpToConfirmPassword}
                    autoComplete="new-password"
                    returnKeyType="next"
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                    size={TextFieldSize.Lg}
                    endAccessory={
                      <TouchableOpacity onPress={() => toggleShowPassword(0)}>
                        <Icon
                          name={
                            showPasswordIndex.includes(0)
                              ? IconName.Eye
                              : IconName.EyeSlash
                          }
                          size={IconSize.Lg}
                          color={colors.icon.alternative}
                        />
                      </TouchableOpacity>
                    }
                  />
                  {password === '' ? (
                    <Text
                      variant={TextVariant.BodySM}
                      color={TextColor.Alternative}
                    >
                      {strings('choose_password.must_be_at_least', {
                        number: MIN_PASSWORD_LENGTH,
                      })}
                    </Text>
                  ) : (
                    <Text variant={TextVariant.BodySM}>
                      {strings('choose_password.password_strength')}
                      <Text
                        variant={TextVariant.BodySM}
                        style={styles[`strength_${passwordStrengthWord}`]}
                      >
                        {' '}
                        {strings(
                          `choose_password.strength_${passwordStrengthWord}`,
                        )}
                      </Text>
                    </Text>
                  )}
                </View>

                <View style={styles.field}>
                  <Label
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Default}
                    style={styles.label}
                  >
                    {strings('choose_password.confirm_password')}
                  </Label>
                  <TextField
                    placeholder={strings('import_from_seed.re_enter_password')}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={showPasswordIndex.includes(1)}
                    placeholderTextColor={colors.text.muted}
                    testID={
                      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID
                    }
                    accessibilityLabel={
                      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID
                    }
                    autoComplete="new-password"
                    onSubmitEditing={onPressCreate}
                    returnKeyType={'done'}
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                    size={TextFieldSize.Lg}
                    endAccessory={
                      <TouchableOpacity onPress={() => toggleShowPassword(1)}>
                        <Icon
                          name={
                            showPasswordIndex.includes(1)
                              ? IconName.Eye
                              : IconName.EyeSlash
                          }
                          size={IconSize.Lg}
                          color={colors.icon.alternative}
                        />
                      </TouchableOpacity>
                    }
                    isDisabled={password === ''}
                  />
                  {checkError() && (
                    <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                      {strings('choose_password.password_error')}
                    </Text>
                  )}
                </View>

                <LoginOptionsSwitchComponent
                  biometryType={biometryType}
                  biometryChoice={biometryChoice}
                  updateBiometryChoice={updateBiometryChoice}
                  setRememberMe={setRememberMe}
                />
              </View>

              <View style={styles.learnMoreContainer}>
                <Checkbox
                  onPress={() => setIsSelected(!isSelected)}
                  isChecked={isSelected}
                  testID={ChoosePasswordSelectorsIDs.IOS_I_UNDERSTAND_BUTTON_ID}
                  accessibilityLabel={
                    ChoosePasswordSelectorsIDs.IOS_I_UNDERSTAND_BUTTON_ID
                  }
                  style={styles.checkbox}
                  label={
                    <View style={styles.learnMoreTextContainer}>
                      <Text
                        variant={TextVariant.BodySM}
                        color={TextColor.Default}
                        numberOfLines={2}
                      >
                        {strings('import_from_seed.learn_more')}{' '}
                      </Text>
                      <Text
                        variant={TextVariant.BodySM}
                        color={TextColor.Primary}
                        onPress={learnMore}
                      >
                        {' ' + strings('reset_password.learn_more')}
                      </Text>
                    </View>
                  }
                />
              </View>

              {!!errorMsg && <Text color={TextColor.Error}>{errorMsg}</Text>}
            </View>

            <View style={styles.ctaWrapper}>
              <Button
                variant={ButtonVariants.Primary}
                onPress={onPressCreate}
                label={strings('choose_password.confirm_cta')}
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
                isDisabled={!canSubmit}
                testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
              />
            </View>
          </KeyboardAwareScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

ChoosePassword.contextType = ThemeContext;

const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) => ({
  passwordSet: () => dispatch(passwordSetAction()),
  passwordUnset: () => dispatch(passwordUnsetAction()),
  setLockTime: (time: number) => dispatch(setLockTimeAction(time)),
  seedphraseNotBackedUp: () => dispatch(seedphraseNotBackedUpAction()),
  dispatchSaveOnboardingEvent: (...event: ITrackingEvent[]) =>
    dispatch(saveOnboardingEvent(event)),
});

const mapStateToProps = (_state: RootState) => ({});

export default connect(mapStateToProps, mapDispatchToProps)(ChoosePassword);

// export default ChoosePassword;
