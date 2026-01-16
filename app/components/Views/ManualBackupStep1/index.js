import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View,
  ActivityIndicator,
  KeyboardAvoidingView,
  ImageBackground } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import TouchableOpacity from '../../Base/TouchableOpacity';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import Logger from '../../../util/Logger';
import { baseStyles } from '../../../styles/common';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import {
  MANUAL_BACKUP_STEPS,
  SEED_PHRASE,
  CONFIRM_PASSWORD,
  WRONG_PASSWORD_ERROR,
} from '../../../constants/onboarding';
import { useTheme } from '../../../util/theme';
import { uint8ArrayToMnemonic } from '../../../util/mnemonic';
import { createStyles } from './styles';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { Authentication } from '../../../core';
import { ManualBackUpStepsSelectorsIDs } from './ManualBackUpSteps.testIds';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import Label from '../../../component-library/components/Form/Label';
import { TextFieldSize } from '../../../component-library/components/Form/TextField';
import TextField from '../../../component-library/components/Form/TextField/TextField';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import { AppThemeKey } from '../../../util/theme/models';
import { useMetrics } from '../../hooks/useMetrics';
import {
  createTrackFunction,
  handleSkipBackup,
  showSeedphraseDefinition,
} from '../../../util/onboarding/backupUtils';

/**
 * View that's shown during the second step of
 * the backup seed phrase flow
 */
const ManualBackupStep1 = ({
  route,
  navigation,
  appTheme,
  saveOnboardingEvent,
}) => {
  const [seedPhraseHidden, setSeedPhraseHidden] = useState(true);
  const [password, setPassword] = useState(undefined);
  const [warningIncorrectPassword, setWarningIncorrectPassword] =
    useState(undefined);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState(SEED_PHRASE);
  const [words, setWords] = useState([]);
  const [hasFunds, setHasFunds] = useState(false);
  const { colors, themeAppearance } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isEnabled: isMetricsEnabled } = useMetrics();

  const backupFlow = route?.params?.backupFlow || false;
  const settingsBackup = route?.params?.settingsBackup || false;

  const steps = MANUAL_BACKUP_STEPS;

  const seedPhrase = route?.params?.seedPhrase;

  const headerLeft = useCallback(
    () => (
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Lg}
          color={colors.text.default}
          style={styles.headerLeft}
        />
      </TouchableOpacity>
    ),
    [colors, navigation, styles.headerLeft],
  );

  const track = useMemo(
    () => createTrackFunction(saveOnboardingEvent),
    [saveOnboardingEvent],
  );

  const updateNavBar = useCallback(() => {
    // Show back button for settings backup and reminder
    if (settingsBackup || backupFlow) {
      navigation.setOptions(
        getOnboardingNavbarOptions(
          route,
          {
            headerLeft,
          },
          colors,
          false, // showLogo = false to hide title
        ),
      );
    } else {
      // Hide header for onboarding flow
      navigation.setOptions({
        headerShown: false,
      });
    }
  }, [navigation, settingsBackup, backupFlow, colors, route, headerLeft]);

  const tryExportSeedPhrase = async (password) => {
    const { KeyringController } = Engine.context;
    const uint8ArrayMnemonic =
      await KeyringController.exportSeedPhrase(password);
    return uint8ArrayToMnemonic(uint8ArrayMnemonic, wordlist).split(' ');
  };

  const showWhatIsSeedphrase = useCallback(() => {
    showSeedphraseDefinition({
      navigation,
      track,
      location: 'manual_backup_step_1',
    });
  }, [navigation, track]);

  useEffect(() => {
    const getSeedphrase = async () => {
      if (!words.length) {
        try {
          const credentials = await Authentication.getPassword();
          if (credentials) {
            setWords(await tryExportSeedPhrase(credentials.password));
          } else {
            setView(CONFIRM_PASSWORD);
          }
        } catch (e) {
          const srpRecoveryError = new Error(
            'Error trying to recover SRP from keyring-controller',
          );
          Logger.error(srpRecoveryError);
          setView(CONFIRM_PASSWORD);
        }
      }
    };

    if (seedPhrase) {
      setWords(seedPhrase);
    } else {
      getSeedphrase();
      setWords(route.params?.words ?? []);
    }

    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  useEffect(() => {
    // Check if user has funds
    if (Engine.hasFunds()) setHasFunds(true);
  }, []);

  const onPasswordChange = (password) => {
    setPassword(password);
  };

  const goNext = () => {
    navigation.navigate('ManualBackupStep2', {
      words,
      steps,
      backupFlow,
      settingsBackup,
    });
  };

  const skip = useCallback(async () => {
    await handleSkipBackup({
      navigation,
      routeParams: route.params,
      isMetricsEnabled,
      track,
    });
  }, [navigation, route.params, isMetricsEnabled, track]);

  const showRemindLater = useCallback(async () => {
    if (hasFunds) return;

    // Track skip initiation
    track(MetaMetricsEvents.WALLET_SECURITY_SKIP_INITIATED);

    await skip();
  }, [hasFunds, skip, track]);

  const revealSeedPhrase = () => {
    setSeedPhraseHidden(false);
    track(MetaMetricsEvents.WALLET_SECURITY_PHRASE_REVEALED, {});
  };

  const tryUnlockWithPassword = async (password) => {
    setReady(false);
    try {
      const seedPhrase = await tryExportSeedPhrase(password);
      setWords(seedPhrase);
      setView(SEED_PHRASE);
      setReady(true);
    } catch (e) {
      let msg = strings('reveal_credential.warning_incorrect_password');
      if (e.toString().toLowerCase() !== WRONG_PASSWORD_ERROR.toLowerCase()) {
        msg = strings('reveal_credential.unknown_error');
      }
      setWarningIncorrectPassword(msg);
      setReady(true);
    }
  };

  const tryUnlock = () => {
    tryUnlockWithPassword(password);
  };

  const renderSeedPhraseConcealer = () => (
    <View style={styles.seedPhraseConcealerContainer}>
      <TouchableOpacity
        onPress={revealSeedPhrase}
        style={styles.blurContainer}
        testID={ManualBackUpStepsSelectorsIDs.BLUR_BUTTON}
      >
        <ImageBackground
          source={
            themeAppearance === AppThemeKey.dark
              ? require('../../../images/dark-blur.png')
              : require('../../../images/blur.png')
          }
          style={styles.blurView}
          resizeMode="cover"
        />
        <View style={styles.seedPhraseConcealer}>
          <Icon
            name={IconName.EyeSlash}
            size={IconSize.Xl}
            color={colors.icon.default}
          />
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {strings('manual_backup_step_1.reveal')}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Default}>
            {strings('manual_backup_step_1.watching')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderConfirmPassword = () => (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={'padding'}
    >
      <KeyboardAwareScrollView style={baseStyles.flexGrow} enableOnAndroid>
        <View style={styles.confirmPasswordWrapper}>
          <View style={[styles.content, styles.passwordRequiredContent]}>
            <View style={styles.text}>
              <Label variant={TextVariant.BodyMD} color={TextColor.Default}>
                {strings('manual_backup_step_1.before_continiuing')}
              </Label>
            </View>
            <View style={styles.field}>
              <TextField
                placeholder={strings('manual_backup_step_1.password')}
                value={password}
                onChangeText={onPasswordChange}
                secureTextEntry
                placeholderTextColor={colors.text.muted}
                onSubmitEditing={tryUnlock}
                testID={ManualBackUpStepsSelectorsIDs.CONFIRM_PASSWORD_INPUT}
                keyboardAppearance={themeAppearance}
                autoCapitalize="none"
                size={TextFieldSize.Lg}
                autoFocus
              />
              {warningIncorrectPassword && (
                <Text style={styles.warningMessageText}>
                  {warningIncorrectPassword}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.buttonWrapper}>
            <Button
              variant={ButtonVariants.Primary}
              onPress={tryUnlock}
              label={strings('manual_backup_step_1.confirm')}
              testID={ManualBackUpStepsSelectorsIDs.SUBMIT_BUTTON}
              width={ButtonWidthTypes.Full}
              size={ButtonSize.Lg}
              isDisabled={!password}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );

  const renderSeedphraseView = () => (
    <View style={styles.actionViewContainer}>
      <View style={styles.actionView}>
        <View
          style={styles.wrapper}
          testID={ManualBackUpStepsSelectorsIDs.STEP_1_CONTAINER}
        >
          <Text variant={TextVariant.DisplayMD} color={TextColor.Default}>
            {strings('manual_backup_step_1.action')}
          </Text>
          <View style={styles.infoWrapper}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('manual_backup_step_1.info-1')}{' '}
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Primary}
                onPress={showWhatIsSeedphrase}
              >
                {strings('manual_backup_step_1.info-2')}{' '}
              </Text>
              {strings('manual_backup_step_1.info-3')}{' '}
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Alternative}
              >
                {strings('manual_backup_step_1.info-4')}
              </Text>
            </Text>
          </View>
          {seedPhraseHidden ? (
            <View style={styles.seedPhraseWrapper}>
              {renderSeedPhraseConcealer()}
            </View>
          ) : (
            <View style={styles.seedPhraseContainer}>
              <FlatList
                data={words}
                numColumns={3}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <View style={[styles.inputContainer]}>
                    <Text
                      variant={TextVariant.BodyMD}
                      color={TextColor.Alternative}
                    >
                      {index + 1}.
                    </Text>
                    <Text
                      variant={TextVariant.BodyMD}
                      color={TextColor.Default}
                      key={index}
                      ellipsizeMode="tail"
                      numberOfLines={1}
                      style={styles.word}
                      testID={`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-${index}`}
                      adjustsFontSizeToFit
                      allowFontScaling
                      minimumFontScale={0.1}
                      maxFontSizeMultiplier={0}
                    >
                      {item}
                    </Text>
                  </View>
                )}
              />
            </View>
          )}
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          variant={ButtonVariants.Primary}
          onPress={goNext}
          label={strings('manual_backup_step_1.continue')}
          width={ButtonWidthTypes.Full}
          size={ButtonSize.Lg}
          isDisabled={seedPhraseHidden}
          testID={ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON}
        />
        {!hasFunds && !backupFlow && !settingsBackup && (
          <Button
            variant={ButtonVariants.Link}
            onPress={showRemindLater}
            label={strings('account_backup_step_1.remind_me_later')}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            testID={ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON}
          />
        )}
      </View>
    </View>
  );

  return ready ? (
    <SafeAreaView
      edges={
        settingsBackup || backupFlow
          ? { bottom: 'additive' }
          : ['top', 'bottom']
      }
      style={styles.mainWrapper}
    >
      <View style={[styles.container]}>
        {view === SEED_PHRASE
          ? renderSeedphraseView()
          : renderConfirmPassword()}
      </View>
      <ScreenshotDeterrent hasNavigation enabled isSRP />
    </SafeAreaView>
  ) : (
    <View style={styles.loader}>
      <ActivityIndicator size="small" />
    </View>
  );
};

ManualBackupStep1.propTypes = {
  /**
  /* navigation object required to push and pop other views
  */
  navigation: PropTypes.object,
  /**
   * Object that represents the current route info like params passed to it
   */
  route: PropTypes.object,
  /**
   * Theme that app is set to
   */
  appTheme: PropTypes.string,
  /**
   * Action to save onboarding event
   */
  saveOnboardingEvent: PropTypes.func,
};

const mapStateToProps = (state) => ({
  appTheme: state.user.appTheme,
});

const mapDispatchToProps = (dispatch) => ({
  saveOnboardingEvent: (...eventArgs) => dispatch(saveEvent(eventArgs)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ManualBackupStep1);
