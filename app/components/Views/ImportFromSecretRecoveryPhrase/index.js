import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useContext,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  View,
  TextInput,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { connect } from 'react-redux';
import StorageWrapper from '../../../store/storage-wrapper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import zxcvbn from 'zxcvbn';
import Clipboard from '@react-native-clipboard/clipboard';
import AppConstants from '../../../core/AppConstants';
import Device from '../../../util/device';
import {
  failedSeedPhraseRequirements,
  isValidMnemonic,
  parseSeedPhrase,
  parseVaultValue,
} from '../../../util/validators';
import Logger from '../../../util/Logger';
import {
  getPasswordStrengthWord,
  passwordRequirementsMet,
  MIN_PASSWORD_LENGTH,
} from '../../../util/password';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useTheme } from '../../../util/theme';
import { passwordSet, seedphraseBackedUp } from '../../../actions/user';
import { QRTabSwitcherScreens } from '../../../components/Views/QRTabSwitcher';
import { setLockTime } from '../../../actions/settings';
import setOnboardingWizardStep from '../../../actions/wizard';
import { strings } from '../../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import {
  BIOMETRY_CHOICE_DISABLED,
  ONBOARDING_WIZARD,
  TRUE,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import Routes from '../../../constants/navigation/Routes';
import createStyles from './styles';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import {
  passcodeType,
  updateAuthTypeStorageFlags,
} from '../../../util/authentication';
import navigateTermsOfUse from '../../../util/termsOfUse/termsOfUse';
import { ImportFromSeedSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ImportFromSeed.selectors';
import { ChoosePasswordSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ChoosePassword.selectors';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Checkbox from '../../../component-library/components/Checkbox';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../component-library/components/Toast/Toast.context';
import { ToastVariants } from '../../../component-library/components/Toast/Toast.types';
import TextField from '../../../component-library/components/Form/TextField/TextField';
import Label from '../../../component-library/components/Form/Label';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { TextFieldSize } from '../../../component-library/components/Form/TextField';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import { saveOnboardingEvent } from '../../../actions/onboarding';
import {
  SRP_LENGTHS,
  NUM_COLUMNS,
  SPACE_CHAR,
  PASSCODE_NOT_SET_ERROR,
  IOS_REJECTED_BIOMETRICS_ERROR,
} from './constant';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import { useAccountsWithNetworkActivitySync } from '../../hooks/useAccountsWithNetworkActivitySync';


const checkValidSeedWord = (text) => wordlist.includes(text);

/**
 * View where users can set restore their account
 * using a secret recovery phrase (SRP)
 * The SRP was formally called the seed phrase
 */
const ImportFromSecretRecoveryPhrase = ({
  navigation,
  passwordSet,
  setLockTime,
  seedphraseBackedUp,
  setOnboardingWizardStep,
  route,
  dispatchSaveOnboardingEvent,
}) => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const seedPhraseInputRefs = useRef([]);
  const confirmPasswordInput = useRef();

  const { toastRef } = useContext(ToastContext);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState();
  const [biometryType, setBiometryType] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometryChoice, setBiometryChoice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hideSeedPhraseInput, setHideSeedPhraseInput] = useState(true);
  const [seedPhrase, setSeedPhrase] = useState([]);
  const [seedPhraseInputFocusedIndex, setSeedPhraseInputFocusedIndex] =
    useState(0);
  const [nextSeedPhraseInputFocusedIndex, setNextSeedPhraseInputFocusedIndex] =
    useState(0);
  const [showAllSeedPhrase, setShowAllSeedPhrase] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [learnMore, setLearnMore] = useState(false);
  const [showPasswordIndex, setShowPasswordIndex] = useState([0, 1]);
  const [containerWidth, setContainerWidth] = useState(0);
  const { fetchAccountsWithActivity } = useAccountsWithNetworkActivitySync({
    onFirstLoad: false,
    onTransactionComplete: false,
  });

  const seedPhraseLength = seedPhrase.filter((item) => item !== '').length;

  const isSRPContinueButtonDisabled = useMemo(
    () => !SRP_LENGTHS.includes(seedPhraseLength),
    [seedPhraseLength],
  );

  const handleLayout = (event) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const track = (event, properties) => {
    const eventBuilder = MetricsEventBuilder.createEventBuilder(event);
    eventBuilder.addProperties(properties);
    trackOnboarding(eventBuilder.build(), dispatchSaveOnboardingEvent);
  };

  const [errorWordIndexes, setErrorWordIndexes] = useState({});

  const handleClear = useCallback(() => {
    setSeedPhrase([]);
    setErrorWordIndexes({});
    setShowAllSeedPhrase(false);
    setError('');
  }, []);

  const handleSeedPhraseChange = useCallback(
    (seedPhraseText, index) => {
      const text = seedPhraseText
        .split('\n')
        .map((item) => item.trim())
        .join(' ');

      if (text.includes(SPACE_CHAR)) {
        const isEndWithSpace = text.at(-1) === SPACE_CHAR;
        // handle use pasting multiple words / whole seed phrase separated by spaces
        const splitArray = text.trim().split(' ');

        const currentErrorWordIndexes = { ...errorWordIndexes };
        splitArray.reduce((acc, x, currentIndex) => {
          if (checkValidSeedWord(x)) {
            currentErrorWordIndexes[index + currentIndex] = false;
          } else {
            currentErrorWordIndexes[index + currentIndex] = true;
          }
          return acc;
        }, []);

        setSeedPhrase((prev) => {
          const endSlices = prev.slice(index + 1);
          if (endSlices.length === 0 && isEndWithSpace) {
            endSlices.push('');
          } else if (isEndWithSpace) {
            endSlices.unshift('');
          }

          return [...prev.slice(0, index), ...splitArray, ...endSlices];
          // input the array into the correct index
        });

        setErrorWordIndexes(currentErrorWordIndexes);
        setNextSeedPhraseInputFocusedIndex(index + splitArray.length);
      } else {
        setSeedPhrase((prev) => {
          // update the word at the correct index
          const newSeedPhrase = [...prev];
          newSeedPhrase[index] = text.trim();
          return newSeedPhrase;
        });
      }
    },
    [
      setSeedPhrase,
      setNextSeedPhraseInputFocusedIndex,
      setErrorWordIndexes,
      errorWordIndexes,
    ],
  );

  const onQrCodePress = useCallback(() => {
    let shouldHideSRP = true;
    if (!hideSeedPhraseInput) {
      shouldHideSRP = false;
    }

    setHideSeedPhraseInput(false);
    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      initialScreen: QRTabSwitcherScreens.Scanner,
      disableTabber: true,
      onScanSuccess: ({ seed = undefined }) => {
        if (seed) {
          handleClear();
          handleSeedPhraseChange(seed, 0);
        } else {
          Alert.alert(
            strings('import_from_seed.invalid_qr_code_title'),
            strings('import_from_seed.invalid_qr_code_message'),
          );
        }
        setHideSeedPhraseInput(shouldHideSRP);
      },
      onScanError: (error) => {
        setHideSeedPhraseInput(shouldHideSRP);
      },
    });
  }, [hideSeedPhraseInput, navigation, handleClear, handleSeedPhraseChange]);

  const onBackPress = () => {
    if (currentStep === 0) {
      navigation.goBack();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const headerLeft = () => (
    <TouchableOpacity
      onPress={onBackPress}
      testID={ImportFromSeedSelectorsIDs.BACK_BUTTON_ID}
    >
      <Icon
        name={IconName.ArrowLeft}
        size={24}
        color={colors.text.default}
        style={styles.headerLeft}
      />
    </TouchableOpacity>
  );

  const headerRight = () =>
    currentStep === 0 ? (
      <TouchableOpacity
        onPress={onQrCodePress}
        testID={ImportFromSeedSelectorsIDs.QR_CODE_BUTTON_ID}
      >
        <Icon
          name={IconName.Scan}
          size={24}
          color={colors.text.default}
          onPress={onQrCodePress}
          style={styles.headerRight}
        />
      </TouchableOpacity>
    ) : (
      <View />
    );

  const updateNavBar = () => {
    navigation.setOptions(
      getOnboardingNavbarOptions(
        route,
        {
          headerLeft,
          headerRight,
        },
        colors,
        false,
      ),
    );
  };

  useEffect(() => {
    updateNavBar();
    const setBiometricsOption = async () => {
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
    };

    setBiometricsOption();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const termsOfUse = useCallback(async () => {
    if (navigation) {
      await navigateTermsOfUse(navigation.navigate);
    }
  }, [navigation]);

  useEffect(() => {
    termsOfUse();
  }, [termsOfUse]);

  const updateBiometryChoice = async (biometryChoice) => {
    await updateAuthTypeStorageFlags(biometryChoice);
    setBiometryChoice(biometryChoice);
  };

  /**
   * This function handles the case when the user rejects the OS prompt for allowing use of biometrics.
   * If this occurs we will create the wallet automatically with password as the login method
   */
  const handleRejectedOsBiometricPrompt = async (parsedSeed) => {
    const newAuthData = await Authentication.componentAuthenticationType(
      false,
      false,
    );
    try {
      await Authentication.newWalletAndRestore(
        password,
        newAuthData,
        parsedSeed,
        true,
      );
    } catch (err) {
      this.setState({ loading: false, error: err.toString() });
    }
    setBiometryType(newAuthData.availableBiometryType);
    updateBiometryChoice(false);
  };

  const onPasswordChange = (value) => {
    const passInfo = zxcvbn(value);

    setPassword(value);
    setPasswordStrength(passInfo.score);
  };

  const onPasswordConfirmChange = (value) => {
    setConfirmPassword(value);
  };

  const jumpToConfirmPassword = () => {
    const { current } = confirmPasswordInput;
    current && current.focus();
  };

  const renderSwitch = () => {
    const handleUpdateRememberMe = (rememberMe) => {
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

  const passwordStrengthWord = getPasswordStrengthWord(passwordStrength);

  const handleKeyPress = (e, index, enterPressed = false) => {
    const { key } = e.nativeEvent;
    if (key === 'Backspace') {
      if (seedPhrase[index] === '') {
        if (index > 0) {
          setNextSeedPhraseInputFocusedIndex(index - 1);
        }
        const newData = seedPhrase.filter((_, idx) => idx !== index);
        setSeedPhrase(newData);
      }
    }
  };

  const handlePaste = useCallback(
    async (focusedIndex) => {
      const text = await Clipboard.getString(); // Get copied text
      if (text.trim() !== '') {
        handleSeedPhraseChange(text, focusedIndex);
      }
    },
    [handleSeedPhraseChange],
  );

  const toggleShowAllSeedPhrase = () => {
    setShowAllSeedPhrase((prev) => !prev);
  };

  const validateSeedPhrase = () => {
    const phrase = seedPhrase.filter((item) => item !== '').join(' ');
    const seedPhraseLength = seedPhrase.length;
    if (!SRP_LENGTHS.includes(seedPhraseLength)) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('import_from_seed.seed_phrase_length_error') },
        ],
        hasNoTimeout: false,
        iconName: IconName.Error,
        iconColor: IconColor.Error,
      });
      return false;
    }

    if (!isValidMnemonic(phrase)) {
      setError(strings('import_from_seed.invalid_seed_phrase'));
      return false;
    }
    return true;
  };

  const handleContinueImportFlow = () => {
    if (!validateSeedPhrase()) {
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const isContinueButtonDisabled = useMemo(
    () =>
      password === '' ||
      confirmPassword === '' ||
      password !== confirmPassword ||
      !learnMore,
    [password, confirmPassword, learnMore],
  );

  const toggleShowPassword = (index) => {
    setShowPasswordIndex((prev) => {
      if (prev.includes(index)) {
        return prev.filter((item) => item !== index);
      }
      return [...prev, index];
    });
  };

  const onPressImport = async () => {
    const vaultSeed = await parseVaultValue(password, seedPhrase.join(' '));
    const parsedSeed = parseSeedPhrase(vaultSeed || seedPhrase.join(' '));

    if (loading) return;
    track(MetaMetricsEvents.WALLET_IMPORT_ATTEMPTED);
    let error = null;
    if (!passwordRequirementsMet(password)) {
      error = strings('import_from_seed.password_length_error');
    } else if (password !== confirmPassword) {
      error = strings('import_from_seed.password_dont_match');
    }

    if (failedSeedPhraseRequirements(parsedSeed)) {
      error = strings('import_from_seed.seed_phrase_requirements');
    } else if (!isValidMnemonic(parsedSeed)) {
      error = strings('import_from_seed.invalid_seed_phrase');
    }

    if (error) {
      Alert.alert(strings('import_from_seed.error'), error);
      track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
        wallet_setup_type: 'import',
        error_type: error,
      });
    } else {
      try {
        setLoading(true);
        const authData = await Authentication.componentAuthenticationType(
          biometryChoice,
          rememberMe,
        );

        try {
          await Authentication.newWalletAndRestore(
            password,
            authData,
            parsedSeed,
            true,
          );
        } catch (err) {
          // retry faceID if the user cancels the
          if (Device.isIos && err.toString() === IOS_REJECTED_BIOMETRICS_ERROR)
            await handleRejectedOsBiometricPrompt(parsedSeed);
        }
        // Get onboarding wizard state
        const onboardingWizard = await StorageWrapper.getItem(
          ONBOARDING_WIZARD,
        );
        setLoading(false);
        passwordSet();
        setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
        seedphraseBackedUp();
        track(MetaMetricsEvents.WALLET_IMPORTED, {
          biometrics_enabled: Boolean(biometryType),
        });
        track(MetaMetricsEvents.WALLET_SETUP_COMPLETED, {
          wallet_setup_type: 'import',
          new_wallet: false,
        });
        !onboardingWizard && setOnboardingWizardStep(1);
        fetchAccountsWithActivity();
        navigation.reset({
          index: 1,
          routes: [
            {
              name: Routes.ONBOARDING.SUCCESS_FLOW,
              params: {
                successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
              },
            },
          ],
        });
      } catch (error) {
        // Should we force people to enable passcode / biometrics?
        if (error.toString() === PASSCODE_NOT_SET_ERROR) {
          Alert.alert(
            'Security Alert',
            'In order to proceed, you need to turn Passcode on or any biometrics authentication method supported in your device (FaceID, TouchID or Fingerprint)',
          );
          setLoading(false);
        } else {
          setLoading(false);
          setError(error.message);
          Logger.log('Error with seed phrase import', error.message);
        }
        track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
          wallet_setup_type: 'import',
          error_type: error.toString(),
        });
      }
    }
  };

  const isError =
    password !== '' && confirmPassword !== '' && password !== confirmPassword;

  const showWhatIsSeedPhrase = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SEEDPHRASE_MODAL,
    });
  };

  const canShowSeedPhraseWord = useCallback(
    (index) =>
      showAllSeedPhrase ||
      errorWordIndexes[index] ||
      index === seedPhraseInputFocusedIndex,
    [showAllSeedPhrase, errorWordIndexes, seedPhraseInputFocusedIndex],
  );

  const learnMoreLink = () => {
    navigation.push('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/',
        title: 'support.metamask.io',
      },
    });
  };

  useEffect(() => {
    if (Object.values(errorWordIndexes).some((value) => value)) {
      setError(strings('import_from_seed.spellcheck_error'));
    } else {
      setError('');
    }
  }, [errorWordIndexes]);

  useEffect(() => {
    seedPhraseInputRefs.current[nextSeedPhraseInputFocusedIndex]?.focus();
  }, [nextSeedPhraseInputFocusedIndex]);

  const handleOnFocus = useCallback(
    (index) => {
      if (!checkValidSeedWord(seedPhrase[seedPhraseInputFocusedIndex])) {
        setErrorWordIndexes((prev) => ({
          ...prev,
          [seedPhraseInputFocusedIndex]: true,
        }));
      } else {
        setErrorWordIndexes((prev) => ({
          ...prev,
          [seedPhraseInputFocusedIndex]: false,
        }));
      }
      setSeedPhraseInputFocusedIndex(index);
    },
    [setSeedPhraseInputFocusedIndex, seedPhrase, seedPhraseInputFocusedIndex],
  );

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAwareScrollView
        style={styles.wrapper}
        resetScrollToCoords={{ x: 0, y: 0 }}
      >
        <View testID={ImportFromSeedSelectorsIDs.CONTAINER_ID}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('import_from_seed.steps', {
              currentStep: currentStep + 1,
              totalSteps: 2,
            })}
          </Text>
          {currentStep === 0 && (
            <>
              <Text
                variant={TextVariant.DisplayMD}
                color={TextColor.Default}
                testID={ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID}
              >
                {strings('import_from_seed.title')}
              </Text>
              <View style={styles.container}>
                <View style={styles.description}>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                  >
                    {strings(
                      'import_from_seed.enter_your_secret_recovery_phrase',
                    )}
                  </Text>
                  <TouchableOpacity onPress={showWhatIsSeedPhrase}>
                    <Icon
                      name={IconName.Info}
                      size={IconSize.Md}
                      color={colors.icon.alternative}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.seedPhraseRoot}>
                  <View style={styles.seedPhraseContainer}>
                    <View style={styles.seedPhraseInnerContainer}>
                      {seedPhrase.length <= 1 ? (
                        <TextInput
                          ref={(ref) => {
                            seedPhraseInputRefs.current[0] = ref;
                          }}
                          textAlignVertical="top"
                          label={strings('import_from_seed.srp')}
                          placeholder={strings(
                            'import_from_seed.srp_placeholder',
                          )}
                          value={seedPhrase?.[0] || ''}
                          onChangeText={(text) =>
                            handleSeedPhraseChange(text, 0)
                          }
                          style={styles.seedPhraseDefaultInput}
                          placeholderTextColor={colors.text.alternative}
                          placeholderStyle={
                            styles.seedPhraseDefaultInputPlaceholder
                          }
                          multiline
                          autoFocus
                          onKeyPress={(e) => handleKeyPress(e, 0)}
                          autoComplete="off"
                          blurOnSubmit={false}
                          autoCapitalize="none"
                          testID={
                            ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID
                          }
                        />
                      ) : (
                        <View
                          style={[styles.seedPhraseInputContainer]}
                          onLayout={handleLayout}
                        >
                          <FlatList
                            data={seedPhrase}
                            numColumns={NUM_COLUMNS}
                            keyExtractor={(_, index) => index.toString()}
                            renderItem={({ item, index }) => (
                              <View
                                style={[
                                  {
                                    width: containerWidth / NUM_COLUMNS,
                                  },
                                  styles.inputPadding,
                                ]}
                              >
                                <TextField
                                  ref={(ref) => {
                                    seedPhraseInputRefs.current[index] = ref;
                                  }}
                                  startAccessory={
                                    <Text
                                      variant={TextVariant.BodyMD}
                                      color={TextColor.Alternative}
                                      style={styles.inputIndex}
                                    >
                                      {index + 1}.
                                    </Text>
                                  }
                                  value={item}
                                  secureTextEntry={
                                    !canShowSeedPhraseWord(index)
                                  }
                                  onFocus={(e) => {
                                    if (
                                      e?.target &&
                                      e?.currentTarget?.setNativeProps
                                    ) {
                                      e?.currentTarget?.setNativeProps({
                                        selection: {
                                          start: e?.target?.value?.length ?? 0,
                                          end: e?.target?.value?.length ?? 0,
                                        },
                                      });
                                    }
                                    handleOnFocus(index);
                                  }}
                                  onChangeText={(text) =>
                                    handleSeedPhraseChange(text, index)
                                  }
                                  placeholderTextColor={colors.text.muted}
                                  onSubmitEditing={(e) => {
                                    handleKeyPress(e, index, true);
                                  }}
                                  onKeyPress={(e) => handleKeyPress(e, index)}
                                  size={TextFieldSize.Md}
                                  style={[styles.input]}
                                  autoComplete="off"
                                  textAlignVertical="center"
                                  showSoftInputOnFocus
                                  isError={errorWordIndexes[index]}
                                  autoCapitalize="none"
                                  numberOfLines={1}
                                  autoFocus={index === seedPhrase.length - 1}
                                  testID={`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`}
                                />
                              </View>
                            )}
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.seedPhraseContainerCta}>
                      <Button
                        variant={ButtonVariants.Link}
                        style={styles.pasteButton}
                        onPress={toggleShowAllSeedPhrase}
                        label={
                          showAllSeedPhrase
                            ? strings('import_from_seed.hide_all')
                            : strings('import_from_seed.show_all')
                        }
                        width={ButtonWidthTypes.Full}
                      />
                      <Button
                        label={
                          seedPhrase.length > 1
                            ? strings('import_from_seed.clear_all')
                            : strings('import_from_seed.paste')
                        }
                        variant={ButtonVariants.Link}
                        style={styles.pasteButton}
                        onPress={() => {
                          if (seedPhrase.length > 1) {
                            handleClear();
                          } else {
                            handlePaste(seedPhraseInputFocusedIndex);
                          }
                        }}
                        width={ButtonWidthTypes.Full}
                      />
                    </View>
                  </View>
                  {error !== '' && (
                    <Text
                      variant={TextVariant.BodySMMedium}
                      color={TextColor.Error}
                    >
                      {error}
                    </Text>
                  )}
                </View>
                <View style={styles.seedPhraseCtaContainer}>
                  <Button
                    variant={ButtonVariants.Primary}
                    label={strings('import_from_seed.continue')}
                    onPress={handleContinueImportFlow}
                    width={ButtonWidthTypes.Full}
                    size={ButtonSize.Lg}
                    isDisabled={isSRPContinueButtonDisabled || Boolean(error)}
                    testID={ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID}
                  />
                </View>
              </View>
            </>
          )}

          {currentStep === 1 && (
            <View style={styles.passwordContainer}>
              <Text
                variant={TextVariant.DisplayMD}
                color={TextColor.Default}
                testID={ChoosePasswordSelectorsIDs.TITLE_ID}
              >
                {strings('import_from_seed.create_password')}
              </Text>

              <View style={styles.passwordContainer}>
                <View style={styles.field}>
                  <Label
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Default}
                    style={styles.label}
                  >
                    {strings('import_from_seed.new_password')}
                  </Label>
                  <TextField
                    placeholder={strings(
                      'import_from_seed.enter_strong_password',
                    )}
                    size={TextFieldSize.Lg}
                    value={password}
                    onChangeText={onPasswordChange}
                    secureTextEntry={showPasswordIndex.includes(0)}
                    returnKeyType={'next'}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    keyboardAppearance={themeAppearance || 'light'}
                    placeholderTextColor={colors.text.muted}
                    onSubmitEditing={jumpToConfirmPassword}
                    endAccessory={
                      <Icon
                        name={
                          showPasswordIndex.includes(0)
                            ? IconName.Eye
                            : IconName.EyeSlash
                        }
                        size={IconSize.Lg}
                        color={colors.icon.alternative}
                        onPress={() => toggleShowPassword(0)}
                        testID={
                          ImportFromSeedSelectorsIDs.NEW_PASSWORD_VISIBILITY_ID
                        }
                      />
                    }
                    testID={ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID}
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
                    <Text
                      style={styles.passwordStrengthLabel}
                      testID={ImportFromSeedSelectorsIDs.PASSWORD_STRENGTH_ID}
                    >
                      {strings('choose_password.password_strength')}
                      <Text style={styles[`strength_${passwordStrengthWord}`]}>
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
                    {strings('import_from_seed.confirm_password')}
                  </Label>
                  <TextField
                    ref={confirmPasswordInput}
                    placeholder={strings('import_from_seed.re_enter_password')}
                    size={TextFieldSize.Lg}
                    onChangeText={onPasswordConfirmChange}
                    secureTextEntry={showPasswordIndex.includes(1)}
                    autoComplete="new-password"
                    returnKeyType={'next'}
                    autoCapitalize="none"
                    value={confirmPassword}
                    placeholderTextColor={colors.text.muted}
                    isError={isError}
                    keyboardAppearance={themeAppearance || 'light'}
                    endAccessory={
                      <Icon
                        name={
                          showPasswordIndex.includes(1)
                            ? IconName.Eye
                            : IconName.EyeSlash
                        }
                        size={IconSize.Lg}
                        color={colors.icon.alternative}
                        onPress={() => toggleShowPassword(1)}
                        testID={
                          ImportFromSeedSelectorsIDs.CONFIRM_PASSWORD_VISIBILITY_ID
                        }
                      />
                    }
                    testID={
                      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID
                    }
                    isDisabled={password === ''}
                  />
                  {isError && (
                    <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                      {strings('import_from_seed.password_error')}
                    </Text>
                  )}
                </View>

                {renderSwitch()}
              </View>

              <View style={styles.learnMoreContainer}>
                <Checkbox
                  onPress={() => setLearnMore(!learnMore)}
                  isChecked={learnMore}
                  style={styles.checkbox}
                  testID={ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID}
                  label={
                    <View style={styles.learnMoreTextContainer}>
                      <Text
                        variant={TextVariant.BodySM}
                        color={TextColor.Default}
                      >
                        {strings('import_from_seed.learn_more')}{' '}
                      </Text>
                      <Text
                        variant={TextVariant.BodySM}
                        color={TextColor.Primary}
                        onPress={learnMoreLink}
                        testID={ImportFromSeedSelectorsIDs.LEARN_MORE_LINK_ID}
                      >
                        {' ' + strings('reset_password.learn_more')}
                      </Text>
                    </View>
                  }
                />
              </View>

              <View style={styles.seedPhraseCtaContainer}>
                <Button
                  width={ButtonWidthTypes.Full}
                  variant={ButtonVariants.Primary}
                  label={strings('import_from_seed.confirm')}
                  onPress={onPressImport}
                  disabled={isContinueButtonDisabled}
                  size={ButtonSize.Lg}
                  isDisabled={isContinueButtonDisabled}
                  testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
                />
              </View>
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>
      <ScreenshotDeterrent enabled isSRP />
    </SafeAreaView>
  );
};

ImportFromSecretRecoveryPhrase.propTypes = {
  /**
   * The navigator object
   */
  navigation: PropTypes.object,
  /**
   * The action to update the password set flag
   * in the redux store
   */
  passwordSet: PropTypes.func,
  /**
   * The action to set the locktime
   * in the redux store
   */
  setLockTime: PropTypes.func,
  /**
   * The action to update the seedphrase backed up flag
   * in the redux store
   */
  seedphraseBackedUp: PropTypes.func,
  /**
   * Action to set onboarding wizard step
   */
  setOnboardingWizardStep: PropTypes.func,
  /**
   * Object that represents the current route info like params passed to it
   */
  route: PropTypes.object,
  /**
   * Action to save onboarding event
   */
  dispatchSaveOnboardingEvent: PropTypes.func,
};

const mapDispatchToProps = (dispatch) => ({
  setLockTime: (time) => dispatch(setLockTime(time)),
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
  passwordSet: () => dispatch(passwordSet()),
  seedphraseBackedUp: () => dispatch(seedphraseBackedUp()),
  dispatchSaveOnboardingEvent: (event) => dispatch(saveOnboardingEvent(event)),
});

export default connect(
  null,
  mapDispatchToProps,
)(ImportFromSecretRecoveryPhrase);
