import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  InteractionManager,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { fontStyles } from '../../../styles/common';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import StyledButton from '../../UI/StyledButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import PubNubWrapper from '../../../util/syncWithExtension';
import Logger from '../../../util/Logger';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import Analytics from '../../../core/Analytics/Analytics';
import DefaultPreference from 'react-native-default-preference';
import PreventScreenshot from '../../../core/PreventScreenshot';
import {
  EXISTING_USER,
  METRICS_OPT_IN,
  SEED_PHRASE_HINTS,
  BIOMETRY_CHOICE,
  BIOMETRY_CHOICE_DISABLED,
  NEXT_MAKER_REMINDER,
  TRUE,
} from '../../../constants/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureKeychain from '../../../core/SecureKeychain';
import Device from '../../../util/device';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import { useDispatch, useSelector } from 'react-redux';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import {
  logIn,
  loadingSet,
  loadingUnset,
  seedphraseNotBackedUp as backedUpSeed,
  passwordSet as passwordIsSet,
} from '../../../actions/user';
import { setLockTime as lockTimeSet } from '../../../actions/settings';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import scaling from '../../../util/scaling';
import { useTheme } from '../../../util/theme';
import { WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID } from '../../../../wdio/screen-objects/testIDs/Screens/WalletSetupScreen.testIds';

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      justifyContent: 'space-between',
      paddingBottom: 16,
    },
    fill: {
      flex: 1,
    },
    syncImage: {
      height: 44,
      marginTop: 48,
      width: 112,
      alignSelf: 'center',
    },
    titleLabel: {
      textAlign: 'center',
      color: colors.text.default,
      fontSize: 24,
      fontFamily: fontStyles.bold.fontFamily,
      marginTop: 32,
    },
    stepsContainer: {
      marginTop: 32,
    },
    stepLabel: {
      color: colors.text.default,
      fontSize: scaling.scale(16),
      fontFamily: fontStyles.normal.fontFamily,
      marginBottom: 8,
    },
    wrapper: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 30,
    },
    loader: {
      marginTop: 180,
      justifyContent: 'center',
      textAlign: 'center',
    },
    loadingText: {
      marginTop: 30,
      fontSize: 14,
      textAlign: 'center',
      color: colors.text.default,
      fontFamily: fontStyles.normal.fontFamily,
    },
  });

// TODO: This file needs typings
const ExtensionSync = ({ navigation, route }: any) => {
  const pubnubWrapperRef = useRef<any>(null);
  const passwordRef = useRef<string | undefined>(undefined);
  const seedWordsRef = useRef(null);
  const importedAccountsRef = useRef(null);
  const dataToSyncRef = useRef<any>(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const passwordSet = useSelector((state: any) => state.user.passwordSet);
  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const loading = useSelector((state: any) => state.user.loadingSet);
  const loadingMsg = useSelector((state: any) => state.user.loadingMsg);

  const dispatch = useDispatch();
  const saveOnboardingEvent = useCallback(
    (event: any) => dispatch(saveEvent(event)),
    [dispatch],
  );
  const setLoading = useCallback(
    (msg: string) => dispatch(loadingSet(msg)),
    [dispatch],
  );
  const unsetLoading = useCallback(() => dispatch(loadingUnset()), [dispatch]);
  const passwordHasBeenSet = useCallback(
    () => dispatch(passwordIsSet()),
    [dispatch],
  );
  const seedphraseBackedUp = useCallback(
    () => dispatch(backedUpSeed()),
    [dispatch],
  );
  const setLockTime = useCallback(
    (time: number) => dispatch(lockTimeSet(time)),
    [dispatch],
  );
  const setLogIn = useCallback(() => dispatch(logIn()), [dispatch]);

  useEffect(
    /* eslint-disable-next-line */
    () => {
      // Unmount
      return () => {
        pubnubWrapperRef.current?.disconnectWebsockets?.();
        unsetLoading();
        InteractionManager.runAfterInteractions(PreventScreenshot.allow);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    // Set navigation options
    navigation.setOptions(
      getOnboardingNavbarOptions(navigation, route, colors),
    );
  }, [navigation, route, colors]);

  // TODO: Don't spread this, break it out and type it
  const track = useCallback(
    (...eventArgs) => {
      InteractionManager.runAfterInteractions(async () => {
        if (Analytics.checkEnabled()) {
          AnalyticsV2.trackEvent(eventArgs[0], eventArgs[1]);
          return;
        }
        const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
        if (!metricsOptIn) {
          saveOnboardingEvent(eventArgs);
        }
      });
    },
    [saveOnboardingEvent],
  );

  const finishSync = useCallback(
    async (opts) => {
      if (opts.biometrics) {
        try {
          await SecureKeychain.setGenericPassword(
            opts.password,
            SecureKeychain.TYPES.BIOMETRICS,
          );
        } catch (e) {
          await SecureKeychain.resetGenericPassword();
        }
      } else {
        await SecureKeychain.resetGenericPassword();
      }

      try {
        await AsyncStorage.removeItem(NEXT_MAKER_REMINDER);
        await Engine.resetState();
        await Engine.sync({
          ...dataToSyncRef.current,
          seed: seedWordsRef.current,
          importedAccounts: importedAccountsRef.current,
          pass: opts.password,
        });
        await AsyncStorage.setItem(EXISTING_USER, TRUE);
        await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
        passwordHasBeenSet();
        setLogIn();
        setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
        seedphraseBackedUp();
        dataToSyncRef.current = null;
        track(MetaMetricsEvents.WALLET_SYNC_SUCCESSFUL);
        track(MetaMetricsEvents.WALLET_SETUP_COMPLETED, {
          wallet_setup_type: 'sync',
          new_wallet: false,
        });

        navigation.push('SyncWithExtensionSuccess');
        unsetLoading();
      } catch (e) {
        track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
          wallet_setup_type: 'sync',
          error_type: e.toString(),
        });
        Logger.error(e, 'Sync::disconnect');
        Alert.alert(
          strings('sync_with_extension.error_title'),
          strings('sync_with_extension.error_message'),
        );
        unsetLoading();
        navigation.goBack();
      }
    },
    [
      setLogIn,
      unsetLoading,
      passwordHasBeenSet,
      setLockTime,
      seedphraseBackedUp,
      track,
      navigation,
    ],
  );

  const disconnect = useCallback(async () => {
    let password: string | undefined;
    try {
      // If there's a password set, let's keep it
      if (passwordSet) {
        // This could also come from the previous step if it's a first time user
        const credentials = await SecureKeychain.getGenericPassword();
        if (credentials) {
          password = credentials.password;
        } else {
          password = passwordRef.current;
        }
        // Otherwise use the password from the extension
      } else {
        password = passwordRef.current;
      }
    } catch (e) {
      password = passwordRef.current;
    }

    if (password === passwordRef.current) {
      let biometryType: BIOMETRY_TYPE | null | 'biometrics' =
        await SecureKeychain.getSupportedBiometryType();
      if (biometryType) {
        if (Device.isAndroid()) biometryType = 'biometrics';
        Alert.alert(
          strings('sync_with_extension.allow_biometrics_title', {
            biometrics: biometryType,
          }),
          strings('sync_with_extension.allow_biometrics_desc', {
            biometrics: biometryType,
          }),
          [
            {
              text: strings('sync_with_extension.warning_cancel_button'),
              onPress: async () => {
                await AsyncStorage.removeItem(BIOMETRY_CHOICE);
                await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
                finishSync({ biometrics: false, password });
              },
              style: 'cancel',
            },
            {
              text: strings('sync_with_extension.warning_ok_button'),
              onPress: async () => {
                await AsyncStorage.setItem(
                  BIOMETRY_CHOICE,
                  biometryType as string,
                );
                await AsyncStorage.removeItem(BIOMETRY_CHOICE_DISABLED);
                finishSync({ biometrics: true, biometryType, password });
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        finishSync({ biometrics: false, password });
      }
    } else {
      finishSync({ biometrics: false, password });
    }
  }, [finishSync, passwordSet, passwordRef]);

  const initWebsockets = useCallback(() => {
    setLoading(strings('sync_with_extension.please_wait'));

    pubnubWrapperRef.current?.addMessageListener?.(
      () => {
        Alert.alert(
          strings('sync_with_extension.error_title'),
          strings('sync_with_extension.error_message'),
        );
        track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
          wallet_setup_type: 'sync',
          error_type: 'onErrorSync',
        });
        unsetLoading();
        return false;
      },
      (data: any) => {
        // this.incomingDataStr = null;
        const { pwd, seed, importedAccounts } = data.udata;
        passwordRef.current = pwd;
        seedWordsRef.current = seed;
        importedAccountsRef.current = importedAccounts;
        delete data.udata;
        dataToSyncRef.current = { ...data };
        pubnubWrapperRef.current?.endSync?.(disconnect);
      },
    );

    pubnubWrapperRef.current?.subscribe?.();
  }, [
    pubnubWrapperRef,
    passwordRef,
    track,
    unsetLoading,
    disconnect,
    setLoading,
  ]);

  const startSync = useCallback(async () => {
    try {
      initWebsockets();
      await pubnubWrapperRef.current?.startSync?.();
      return true;
    } catch (e) {
      unsetLoading();
      if (e.message === 'Sync::timeout') {
        Alert.alert(
          strings('sync_with_extension.outdated_qr_code'),
          strings('sync_with_extension.outdated_qr_code_desc'),
        );
      } else {
        Alert.alert(
          strings('sync_with_extension.something_wrong'),
          strings('sync_with_extension.something_wrong_desc'),
        );
      }
      Logger.error(e, { message: 'Sync::startSync', firstAttempt: true });
      track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
        wallet_setup_type: 'sync',
        error_type: e.message(),
      });
      return false;
    }
  }, [initWebsockets, pubnubWrapperRef, track, unsetLoading]);

  const onStartScan = useCallback(
    async (data) => {
      if (data.content && data.content.search('metamask-sync:') !== -1) {
        const [channelName, cipherKey] = data.content
          .replace('metamask-sync:', '')
          .split('|@|');
        pubnubWrapperRef.current = new PubNubWrapper(channelName, cipherKey);
        await pubnubWrapperRef.current?.establishConnection?.(selectedAddress);
      } else {
        Alert.alert(
          strings('sync_with_extension.invalid_qr_code'),
          strings('sync_with_extension.invalid_qr_code_desc'),
        );
      }
    },
    [selectedAddress],
  );

  const onScanSuccess = useCallback(
    async (data) => {
      if (data.content && data.content.search('metamask-sync:') !== -1) {
        await startSync();
      } else {
        Alert.alert(
          strings('sync_with_extension.invalid_qr_code'),
          strings('sync_with_extension.invalid_qr_code_desc'),
        );
      }
    },
    [startSync],
  );

  const triggerScan = useCallback(() => {
    navigation.push('QRScanner', {
      onStartScan,
      onScanSuccess,
    });
  }, [onStartScan, onScanSuccess, navigation]);

  const renderSyncImage = useCallback(
    () => (
      <Image
        style={styles.syncImage}
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../../images/sync-icon.png')}
      />
    ),

    [styles],
  );

  const renderTitle = useCallback(
    () => (
      <Text style={styles.titleLabel}>{strings('onboarding.scan_title')}</Text>
    ),
    [styles],
  );

  const renderSteps = useCallback(() => {
    const steps = [1, 2, 3, 4];
    return (
      <View style={styles.stepsContainer}>
        {steps.map((stepIndex) => {
          const text = `onboarding.scan_step_${stepIndex}`;
          return (
            <Text style={styles.stepLabel} key={text}>
              {`${stepIndex}. ${strings(text)}`}
            </Text>
          );
        })}
      </View>
    );
  }, [styles]);

  const renderScanButton = useCallback(
    () => (
      <StyledButton
        type={'blue'}
        onPress={triggerScan}
        testID={WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID}
      >
        {strings('onboarding.scan')}
      </StyledButton>
    ),
    [triggerScan],
  );

  const renderLoader = useCallback(
    () => (
      <View style={styles.wrapper}>
        <View style={styles.loader}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>{loadingMsg}</Text>
        </View>
      </View>
    ),
    [loadingMsg, styles],
  );

  const renderContent = useCallback(
    () => (
      <React.Fragment>
        <View style={styles.fill}>
          {renderSyncImage()}
          {renderTitle()}
          {renderSteps()}
        </View>
        {renderScanButton()}
      </React.Fragment>
    ),
    [renderSyncImage, renderTitle, renderSteps, renderScanButton, styles],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      {loading ? renderLoader() : renderContent()}
    </SafeAreaView>
  );
};

export default ExtensionSync;
