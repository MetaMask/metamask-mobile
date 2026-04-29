import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Label,
  TextColor,
  Text,
  TextVariant,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
  TextField,
  Button,
  ButtonVariant,
  ButtonSize,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import Logger from '../../../util/Logger';
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
import { MetaMetricsEvents } from '../../../core/Analytics';
import type { ITrackingEvent } from '../../../core/Analytics/MetaMetrics.types';
import { Authentication } from '../../../core';
import { ManualBackUpStepsSelectorsIDs } from './ManualBackUpSteps.testIds';
import SeedPhraseConcealer from '../RevealPrivateCredential/components/SeedPhraseConcealer';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import {
  createTrackFunction,
  handleSkipBackup,
  showSeedphraseDefinition,
} from '../../../util/onboarding/backupUtils';
import type { ManualBackupStep1RouteProp } from './ManualBackupStep1.types';
/**
 * View that's shown during the second step of
 * the backup seed phrase flow
 */
const ManualBackupStep1 = () => {
  const navigation = useNavigation();
  const route = useRoute<ManualBackupStep1RouteProp>();
  const dispatch = useDispatch();
  const tw = useTailwind();

  const saveOnboardingEvent = useCallback(
    (event: ITrackingEvent) => {
      dispatch(saveEvent([event]));
    },
    [dispatch],
  );

  const [seedPhraseHidden, setSeedPhraseHidden] = useState(true);
  const [password, setPassword] = useState('');
  const [warningIncorrectPassword, setWarningIncorrectPassword] = useState<
    string | undefined
  >(undefined);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState(SEED_PHRASE);
  const [words, setWords] = useState<string[]>([]);
  const [hasFunds, setHasFunds] = useState(false);
  const { colors, themeAppearance } = useTheme();
  const { isEnabled: isMetricsEnabled } = useAnalytics();

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
          color={IconColor.IconDefault}
          style={tw.style('ml-4')}
        />
      </TouchableOpacity>
    ),
    [navigation, tw],
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
            // Explicitly set headerRight to undefined to prevent any default
            // header right component from appearing in backup flows
            headerRight: undefined,
          },
          colors,
          false,
        ),
      );
    } else {
      // Hide header for onboarding flow
      navigation.setOptions({
        headerShown: false,
      });
    }
  }, [navigation, settingsBackup, backupFlow, colors, route, headerLeft]);

  const tryExportSeedPhrase = async (pwd: string): Promise<string[]> => {
    const { KeyringController } = Engine.context;
    const uint8ArrayMnemonic = await KeyringController.exportSeedPhrase(pwd);
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
    let cancelled = false;

    const initializeSeedPhrase = async () => {
      if (seedPhrase) {
        if (!cancelled) {
          setWords(seedPhrase);
          setReady(true);
        }
        return;
      }

      const wordsFromParams = route.params?.words;
      if (wordsFromParams && wordsFromParams.length > 0) {
        if (!cancelled) {
          setWords(wordsFromParams);
          setReady(true);
        }
        return;
      }

      try {
        const credentials = await Authentication.getPassword();
        if (cancelled) return;

        if (credentials && !cancelled) {
          const exportedWords = await tryExportSeedPhrase(credentials.password);
          if (!cancelled) {
            setWords(exportedWords);
            setReady(true);
          }
        } else if (!cancelled) {
          setView(CONFIRM_PASSWORD);
          setReady(true);
        }
      } catch (e) {
        const srpRecoveryError = new Error(
          'Error trying to recover SRP from keyring-controller',
        );
        Logger.error(srpRecoveryError);
        if (!cancelled) {
          setView(CONFIRM_PASSWORD);
          setReady(true);
        }
      }
    };

    initializeSeedPhrase();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  useEffect(() => {
    // Check if user has funds
    if (Engine.hasFunds()) setHasFunds(true);
  }, []);

  const onPasswordChange = (pwd: string) => {
    setPassword(pwd);
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

  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const tryUnlockWithPassword = async (pwd: string) => {
    setReady(false);
    try {
      const exportedSeedPhrase = await tryExportSeedPhrase(pwd);
      if (!isMountedRef.current) return;
      setWords(exportedSeedPhrase);
      setView(SEED_PHRASE);
      setReady(true);
    } catch (e) {
      if (!isMountedRef.current) return;
      let msg = strings('reveal_credential.warning_incorrect_password');
      if (String(e).toLowerCase() !== WRONG_PASSWORD_ERROR.toLowerCase()) {
        msg = strings('reveal_credential.unknown_error');
      }
      setWarningIncorrectPassword(msg);
      setReady(true);
    }
  };

  const tryUnlock = () => {
    if (password) {
      tryUnlockWithPassword(password);
    }
  };

  const renderSeedPhraseConcealer = () => (
    <SeedPhraseConcealer
      onReveal={revealSeedPhrase}
      testID={ManualBackUpStepsSelectorsIDs.BLUR_BUTTON}
    />
  );

  const renderConfirmPassword = () => (
    <KeyboardAvoidingView
      style={tw.style('flex-1 flex-row self-center mb-[30px]')}
      behavior={'padding'}
    >
      <KeyboardAwareScrollView style={tw.style('flex-grow')} enableOnAndroid>
        <Box twClassName="flex-1">
          <Box
            alignItems={BoxAlignItems.Start}
            marginBottom={5}
            twClassName="flex-1"
          >
            <Box
              marginBottom={2}
              justifyContent={BoxJustifyContent.Center}
              twClassName="flex-1"
            >
              <Label color={TextColor.TextDefault}>
                {strings('manual_backup_step_1.before_continiuing')}
              </Label>
            </Box>
            <Box twClassName="relative flex-col gap-0.5 w-full">
              <TextField
                placeholder={strings('manual_backup_step_1.password')}
                value={password}
                onChangeText={onPasswordChange}
                secureTextEntry
                onSubmitEditing={tryUnlock}
                testID={ManualBackUpStepsSelectorsIDs.CONFIRM_PASSWORD_INPUT}
                accessibilityLabel={
                  ManualBackUpStepsSelectorsIDs.CONFIRM_PASSWORD_INPUT
                }
                keyboardAppearance={themeAppearance}
                autoCapitalize="none"
                autoFocus
              />
              {warningIncorrectPassword && (
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.ErrorDefault}
                >
                  {warningIncorrectPassword}
                </Text>
              )}
            </Box>
          </Box>
          <Box
            marginTop={0}
            justifyContent={BoxJustifyContent.End}
            twClassName="flex-1"
          >
            <Button
              variant={ButtonVariant.Primary}
              onPress={tryUnlock}
              testID={ManualBackUpStepsSelectorsIDs.SUBMIT_BUTTON}
              isFullWidth
              size={ButtonSize.Lg}
              isDisabled={!password}
            >
              {strings('manual_backup_step_1.confirm')}
            </Button>
          </Box>
        </Box>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );

  const renderSeedphraseView = () => (
    <Box twClassName="flex-1 justify-between">
      <Box twClassName="flex-1">
        <Box
          twClassName="flex-1 flex-col gap-4"
          testID={ManualBackUpStepsSelectorsIDs.STEP_1_CONTAINER}
        >
          <Text variant={TextVariant.DisplayMd} color={TextColor.TextDefault}>
            {strings('manual_backup_step_1.action')}
          </Text>
          <Box justifyContent={BoxJustifyContent.Start}>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('manual_backup_step_1.info-1')}{' '}
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.PrimaryDefault}
                onPress={showWhatIsSeedphrase}
              >
                {strings('manual_backup_step_1.info-2')}{' '}
              </Text>
              {strings('manual_backup_step_1.info-3')}{' '}
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {strings('manual_backup_step_1.info-4')}
              </Text>
            </Text>
          </Box>
          {seedPhraseHidden ? (
            <Box twClassName="bg-default rounded-lg flex-row border border-default min-h-[230px]">
              {renderSeedPhraseConcealer()}
            </Box>
          ) : (
            <Box twClassName="p-4 bg-muted rounded-[10px] min-h-[232px]">
              <FlatList
                data={words}
                numColumns={3}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <Box twClassName="flex-row items-center h-10 border border-muted rounded-lg px-2 py-1 bg-default flex-1 m-1 gap-x-1.5">
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                      maxFontSizeMultiplier={1}
                    >
                      {index + 1}.
                    </Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextDefault}
                      key={index}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      style={tw.style('flex-1')}
                      testID={`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-${index}`}
                      maxFontSizeMultiplier={1}
                    >
                      {item}
                    </Text>
                  </Box>
                )}
              />
            </Box>
          )}
        </Box>
      </Box>
      <Box
        twClassName={`px-0 gap-4 flex justify-center items-center ${Platform.OS === 'android' ? 'mb-4' : 'mb-0'}`}
      >
        <Button
          variant={ButtonVariant.Primary}
          onPress={goNext}
          isFullWidth
          size={ButtonSize.Lg}
          isDisabled={seedPhraseHidden}
          testID={ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON}
        >
          {strings('manual_backup_step_1.continue')}
        </Button>
        {!hasFunds && !backupFlow && !settingsBackup && (
          <Button
            variant={ButtonVariant.Tertiary}
            onPress={showRemindLater}
            size={ButtonSize.Lg}
            isFullWidth
            testID={ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON}
          >
            {strings('account_backup_step_1.remind_me_later')}
          </Button>
        )}
      </Box>
    </Box>
  );

  return ready ? (
    <SafeAreaView
      edges={
        settingsBackup || backupFlow
          ? { bottom: 'additive' }
          : ['top', 'bottom']
      }
      style={tw.style('bg-default flex-1')}
    >
      <Box twClassName="flex-1 px-4">
        {view === SEED_PHRASE
          ? renderSeedphraseView()
          : renderConfirmPassword()}
      </Box>
      <ScreenshotDeterrent hasNavigation enabled isSRP />
    </SafeAreaView>
  ) : (
    <Box twClassName="bg-default flex-1 min-h-[300px] justify-center items-center">
      <ActivityIndicator size="small" />
    </Box>
  );
};

export default ManualBackupStep1;
