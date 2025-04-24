import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Appearance,
  FlatList,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
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
import ActionView from '../../UI/ActionView';
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
import { ManualBackUpStepsSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ManualBackUpSteps.selectors';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import Label from '../../../component-library/components/Form/Label';
import { TextFieldSize } from '../../../component-library/components/Form/TextField';
import TextField from '../../../component-library/components/Form/TextField/TextField';
import Routes from '../../../constants/navigation/Routes';

/**
 * View that's shown during the second step of
 * the backup seed phrase flow
 */
const ManualBackupStep1 = ({ route, navigation, appTheme }) => {
  const [seedPhraseHidden, setSeedPhraseHidden] = useState(true);
  const [password, setPassword] = useState(undefined);
  const [warningIncorrectPassword, setWarningIncorrectPassword] =
    useState(undefined);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState(SEED_PHRASE);
  const [words, setWords] = useState([]);
  const { colors, themeAppearance } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const backupFlow = route.params?.backupFlow || false;

  const steps = MANUAL_BACKUP_STEPS;

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getOnboardingNavbarOptions(
        route,
        {
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon
                name={IconName.ArrowLeft}
                size={IconSize.Lg}
                color={colors.text.default}
                style={styles.headerLeft}
              />
            </TouchableOpacity>
          ),
        },
        colors,
        false,
      ),
    );
  }, [colors, navigation, route, styles.headerLeft]);

  const tryExportSeedPhrase = async (password) => {
    const { KeyringController } = Engine.context;
    const uint8ArrayMnemonic = await KeyringController.exportSeedPhrase(
      password,
    );
    return uint8ArrayToMnemonic(uint8ArrayMnemonic, wordlist).split(' ');
  };

  const showWhatIsSeedphrase = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SEEDPHRASE_MODAL,
    });
  };

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

    getSeedphrase();
    setWords(route.params?.words ?? []);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const onPasswordChange = (password) => {
    setPassword(password);
  };

  const goNext = () => {
    navigation.navigate('ManualBackupStep2', {
      words,
      steps,
      backupFlow,
    });
  };

  const revealSeedPhrase = () => {
    setSeedPhraseHidden(false);
    trackOnboarding(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.WALLET_SECURITY_PHRASE_REVEALED,
      ).build(),
    );
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

  const getBlurType = () => {
    let blurType = 'light';
    switch (appTheme) {
      case 'light':
        blurType = 'light';
        break;
      case 'dark':
        blurType = 'dark';
        break;
      case 'os':
        blurType = Appearance.getColorScheme();
        break;
      default:
        blurType = 'light';
    }
    return blurType;
  };

  const renderSeedPhraseConcealer = () => {
    const blurType = getBlurType();

    return (
      <View style={styles.seedPhraseConcealerContainer}>
        <TouchableOpacity
          onPress={revealSeedPhrase}
          style={styles.blurContainer}
        >
          <ImageBackground
            source={require('../../../images/blur.png')}
            style={styles.blurView}
            resizeMode="cover"
          />
          <View style={styles.seedPhraseConcealer}>
            <Icon
              name={IconName.EyeSlashSolid}
              size={IconSize.Xl}
              color={colors.overlay.default}
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
  };

  const renderConfirmPassword = () => (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={'padding'}
    >
      <KeyboardAwareScrollView style={baseStyles.flexGrow} enableOnAndroid>
        <View style={styles.confirmPasswordWrapper}>
          <View style={[styles.content, styles.passwordRequiredContent]}>
            <Text variant={TextVariant.DisplayMD} color={TextColor.Default}>
              {strings('manual_backup_step_1.confirm_password')}
            </Text>
            <View style={styles.text}>
              <Label variant={TextVariant.BodyMD} color={TextColor.Default}>
                {strings('manual_backup_step_1.before_continiuing')}
              </Label>
            </View>
            <View style={styles.field}>
              <TextField
                placeholder={'Password'}
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
    <ActionView
      confirmTestID={ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON}
      confirmText={strings('manual_backup_step_1.continue')}
      onConfirmPress={goNext}
      confirmDisabled={seedPhraseHidden}
      showCancelButton={false}
      confirmButtonMode={'confirm'}
      rootStyle={styles.actionView}
      buttonContainerStyle={styles.buttonContainer}
    >
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
            <View style={styles.seedPhraseInputContainer}>
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
                    >
                      {item}
                    </Text>
                  </View>
                )}
              />
            </View>
          </View>
        )}
      </View>
    </ActionView>
  );

  return ready ? (
    <SafeAreaView style={styles.mainWrapper}>
      <View style={[styles.container]}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          Step 2 of 3
        </Text>
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
};

const mapStateToProps = (state) => ({
  appTheme: state.user.appTheme,
});

export default connect(mapStateToProps)(ManualBackupStep1);
