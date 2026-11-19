import { useState, useEffect, useRef, useCallback } from 'react';
import { captureException } from '@sentry/react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { AccountImportStrategy } from '@metamask/keyring-controller';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  passwordSet as passwordSetAction,
  passwordUnset as passwordUnsetAction,
  seedphraseNotBackedUp,
} from '../../../../actions/user';
import { setLockTime as setLockTimeAction } from '../../../../actions/settings';
import Engine from '../../../../core/Engine';
import { passcodeType } from '../../../../util/authentication';
import AppConstants from '../../../../core/AppConstants';
import Logger from '../../../../util/Logger';
import { ONBOARDING } from '../../../../constants/navigation';
import {
  SEED_PHRASE_HINTS,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
} from '../../../../constants/storage';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  AccountType,
  getSocialAccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../../../constants/onboarding';
import { Authentication } from '../../../../core';
import type { AuthData } from '../../../../core/Authentication/Authentication';
import AUTHENTICATION_TYPE from '../../../../constants/userProperties';
import Routes from '../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import type { OnboardingFoxLoaderRef } from '../../../UI/OnboardingFoxLoader/OnboardingFoxLoader';
import {
  TraceName,
  endTrace,
  trace,
  TraceOperation,
  getTraceContext,
} from '../../../../util/trace';
import { uint8ArrayToMnemonic } from '../../../../util/mnemonic';
import { getWalletSetupAttributionPropsFromStore } from '../../../../util/analytics/walletSetupCompletedAttribution';
import { ensurePasswordlessRecoverySetup } from '../../../../core/MfaRecovery/ensurePasswordlessRecoverySetup';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import generateDeviceAnalyticsMetaData, {
  UserSettingsAnalyticsMetaData as generateUserSettingsAnalyticsMetaData,
} from '../../../../util/metrics';
import { selectOnboardingAccountType } from '../../../../selectors/onboarding';
import { useOnboardingInterestQuestionnaireEligibility } from '../../../../hooks/useOnboardingInterestQuestionnaireEligibility';
import { useOnboardingTrack } from './useOnboardingTrack';
import { usePasswordSetupTracking } from './usePasswordSetupTracking';

interface KeyringState {
  type: string;
  accounts: string[];
}

interface KeyringControllerState {
  keyrings: KeyringState[];
}

interface ExtendedKeyringController {
  state: KeyringControllerState;
  exportAccount: (
    credentials: { password: string },
    account: string,
  ) => Promise<string>;
  addNewAccount: () => Promise<void>;
  exportSeedPhrase: (credentials: { password: string }) => Promise<Uint8Array>;
  importAccountWithStrategy: (
    strategy: AccountImportStrategy,
    args: string[],
  ) => Promise<string>;
}

async function exportSimpleKeyPairAccounts(
  keyringController: ExtendedKeyringController,
  keychainPassword: string,
): Promise<string[]> {
  const simpleKeyrings = keyringController.state.keyrings.filter(
    (keyring) => keyring.type === 'Simple Key Pair',
  );
  const importedAccounts: string[] = [];
  for (const simpleKeyring of simpleKeyrings) {
    const simpleKeyringAccounts = await Promise.all(
      simpleKeyring.accounts.map((account) =>
        keyringController.exportAccount(
          { password: keychainPassword },
          account,
        ),
      ),
    );
    importedAccounts.push(...simpleKeyringAccounts);
  }
  return importedAccounts;
}

async function reimportPrivateKeyAccounts(
  keyringController: ExtendedKeyringController,
  importedAccounts: string[],
): Promise<void> {
  for (const importedAccount of importedAccounts) {
    await keyringController.importAccountWithStrategy(
      AccountImportStrategy.privateKey,
      [importedAccount],
    );
  }
}

interface UseWalletCreationInput {
  password: string;
  isSocialLogin: boolean | undefined;
  provider?: string;
  previousScreen?: string;
  marketingOptInChecked: boolean;
  /** Social create only; runs once the new social wallet exists. */
  applyMarketingOptIn?: (isOptedIn: boolean) => void;
}

export const useWalletCreation = ({
  password,
  isSocialLogin,
  provider,
  previousScreen,
  marketingOptInChecked,
  applyMarketingOptIn,
}: UseWalletCreationInput) => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const metrics = useAnalytics();
  const track = useOnboardingTrack();
  const [loading, setLoading] = useState(false);
  const [biometryType, setBiometryType] = useState<string | null>(null);
  // Flag to know if password in keyring was set or not
  const keyringControllerPasswordSet = useRef(false);
  const foxRiveLoaderRef = useRef<OnboardingFoxLoaderRef>(null);

  const reduxAccountType = useSelector(selectOnboardingAccountType);
  const { shouldShowQuestionnaire } =
    useOnboardingInterestQuestionnaireEligibility();

  usePasswordSetupTracking({ isLoading: loading, provider, previousScreen });

  const tryExportSeedPhrase = useCallback(async (pwd: string) => {
    const context = Engine.context;
    const uint8ArrayMnemonic = await context.KeyringController.exportSeedPhrase(
      { password: pwd },
    );
    return uint8ArrayToMnemonic(uint8ArrayMnemonic, wordlist).split(' ');
  }, []);

  const recreateVault = useCallback(
    async (pwd: string, authType?: AuthData) => {
      const context = Engine.context;
      const keyringController =
        context.KeyringController as unknown as ExtendedKeyringController;
      const keychainPassword = keyringControllerPasswordSet.current
        ? password
        : '';
      const seedPhraseUint8 = await context.KeyringController.exportSeedPhrase({
        password: keychainPassword,
      });
      const seedPhrase = uint8ArrayToMnemonic(seedPhraseUint8, wordlist);

      let importedAccounts: string[] = [];
      try {
        importedAccounts = await exportSimpleKeyPairAccounts(
          keyringController,
          keychainPassword,
        );
      } catch (e) {
        Logger.error(
          e as Error,
          'error while trying to get imported accounts on recreate vault',
        );
      }

      // Recreate keyring with password given to this method
      await Authentication.newWalletAndRestore(
        pwd,
        authType as AuthData,
        seedPhrase,
        true,
      );
      // Keyring is set with empty password or not
      keyringControllerPasswordSet.current = pwd !== '';

      // Get props to restore vault
      const hdKeyring = keyringController.state.keyrings[0];
      const existingAccountCount = hdKeyring.accounts.length;

      // Create previous accounts again
      for (let i = 0; i < existingAccountCount - 1; i++) {
        await keyringController.addNewAccount();
      }

      // Import imported accounts again
      try {
        await reimportPrivateKeyAccounts(keyringController, importedAccounts);
      } catch (e) {
        Logger.error(
          e as Error,
          'error while trying to import accounts on recreate vault',
        );
      }
    },
    [password],
  );

  const handleWalletCreation = useCallback(
    async (authType: AuthData, previous_screen: string | undefined) => {
      // Ask user to allow biometrics access control
      authType.currentAuthType =
        await Authentication.requestBiometricsAccessControlForIOS(
          authType.currentAuthType,
        );

      if (previous_screen?.toLowerCase() === ONBOARDING.toLowerCase()) {
        await Authentication.newWalletAndKeychain(password, authType);
        keyringControllerPasswordSet.current = true;
        dispatch(seedphraseNotBackedUp());
      } else {
        await recreateVault(password, authType);
      }
    },
    [password, recreateVault, dispatch],
  );

  const onContinueNavigation = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: Routes.ONBOARDING.SUCCESS_FLOW,
          params: {
            screen: Routes.ONBOARDING.SUCCESS,
            params: {
              successFlow: ONBOARDING_SUCCESS_FLOW.SEEDLESS_ONBOARDING,
            },
          },
        },
      ],
    });
  }, [navigation]);

  const handlePostWalletCreation = useCallback(
    async (authType: AuthData, isMarketingOptedIn: boolean) => {
      dispatch(passwordSetAction());
      dispatch(setLockTimeAction(AppConstants.DEFAULT_LOCK_TIMEOUT));

      if (!authType.oauth2Login) {
        const seedPhrase = await tryExportSeedPhrase(password);
        (
          navigation as unknown as {
            replace: (screen: string, params?: object) => void;
          }
        ).replace('ManualBackupStep1', {
          seedPhrase,
          backupFlow: false,
          settingsBackup: false,
        });
        return;
      }

      endTrace({ name: TraceName.OnboardingNewSocialCreateWallet });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      applyMarketingOptIn?.(isMarketingOptedIn);

      const socialAccountType =
        provider !== undefined
          ? getSocialAccountType(provider, false)
          : undefined;

      const analyticsProperties = {
        [UserProfileProperty.HAS_MARKETING_CONSENT]:
          Boolean(isMarketingOptedIn),
        is_metrics_opted_in: true,
        location: 'onboarding_choosePassword',
        updated_after_onboarding: false,
        ...(socialAccountType && { account_type: socialAccountType }),
      };
      const identifyTraits = {
        ...generateDeviceAnalyticsMetaData(),
        ...generateUserSettingsAnalyticsMetaData(),
      };

      try {
        metrics.trackEvent(
          metrics
            .createEventBuilder(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED)
            .addProperties(analyticsProperties)
            .build(),
        );

        await metrics.identify(identifyTraits);
      } catch (analyticsError) {
        Logger.error(analyticsError as Error);
      }

      // New social wallet: seal Recovery Secret while unlocked. Soft-fails.
      await ensurePasswordlessRecoverySetup();

      const accountType = reduxAccountType;
      if (shouldShowQuestionnaire) {
        navigation.navigate(Routes.ONBOARDING.INTEREST_QUESTIONNAIRE, {
          onComplete: onContinueNavigation,
          ...(accountType && { accountType }),
        });
      } else {
        onContinueNavigation();
      }
    },
    [
      dispatch,
      applyMarketingOptIn,
      provider,
      metrics,
      reduxAccountType,
      shouldShowQuestionnaire,
      navigation,
      onContinueNavigation,
      tryExportSeedPhrase,
      password,
    ],
  );

  const handleWalletCreationError = useCallback(
    async (caughtError: Error, metricsEnabled: boolean) => {
      try {
        await recreateVault('');
      } catch (e) {
        Logger.error(e as Error);
      }

      // Reset state - don't set existing user since wallet creation failed
      await StorageWrapper.removeItem(SEED_PHRASE_HINTS);
      dispatch(passwordUnsetAction());
      dispatch(setLockTimeAction(-1));
      setLoading(false);

      const socialAccountType = provider
        ? getSocialAccountType(provider, false)
        : undefined;

      track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
        wallet_setup_type: 'new',
        error_type: caughtError.toString(),
        ...(socialAccountType && { account_type: socialAccountType }),
      });

      const journeyCtx = getTraceContext({
        name: TraceName.OnboardingJourneyOverall,
      });
      if (journeyCtx) {
        trace({
          name: TraceName.OnboardingPasswordSetupError,
          op: TraceOperation.OnboardingUserJourney,
          parentContext: journeyCtx,
          tags: { errorMessage: caughtError.toString() },
        });
        endTrace({ name: TraceName.OnboardingPasswordSetupError });
      }

      if (metricsEnabled) {
        captureException(caughtError, {
          tags: {
            view: 'ChoosePassword',
            context: 'Wallet creation failed - auto reported',
          },
        });
      }

      // Navigate to error screen
      navigation.reset({
        routes: [
          {
            name: Routes.ONBOARDING.WALLET_CREATION_ERROR,
            params: {
              metricsEnabled,
              error: caughtError,
              ...(socialAccountType && { accountType: socialAccountType }),
            },
          },
        ],
      });
    },
    [recreateVault, dispatch, track, provider, navigation],
  );

  const runWalletCreation = useCallback(
    async (accountType: AccountType) => {
      setLoading(true);

      const authType = await Authentication.componentAuthenticationType(
        true,
        false,
      );
      authType.oauth2Login = isSocialLogin;

      const journeyCtx = getTraceContext({
        name: TraceName.OnboardingJourneyOverall,
      });
      if (journeyCtx) {
        trace({
          name: TraceName.OnboardingSRPAccountCreationTime,
          op: TraceOperation.OnboardingUserJourney,
          parentContext: journeyCtx,
          tags: {
            is_social_login: Boolean(provider),
            account_type: accountType,
            biometrics_enabled: Boolean(biometryType),
          },
        });
      }

      Logger.log('previous_screen', previousScreen);

      await handleWalletCreation(authType, previousScreen);

      foxRiveLoaderRef.current?.stop();

      await handlePostWalletCreation(authType, marketingOptInChecked);

      track(MetaMetricsEvents.WALLET_CREATED, {
        biometrics_enabled: Boolean(biometryType),
        account_type: accountType,
      });

      let walletSetupAttributionProps = {};
      if (isSocialLogin) {
        walletSetupAttributionProps = getWalletSetupAttributionPropsFromStore(
          marketingOptInChecked,
        );
      }

      track(MetaMetricsEvents.WALLET_SETUP_COMPLETED, {
        wallet_setup_type: 'new',
        new_wallet: true,
        account_type: accountType,
        ...walletSetupAttributionProps,
      });

      endTrace({ name: TraceName.OnboardingSRPAccountCreationTime });
    },
    [
      isSocialLogin,
      provider,
      previousScreen,
      biometryType,
      handleWalletCreation,
      handlePostWalletCreation,
      track,
      marketingOptInChecked,
    ],
  );

  const startWalletCreation = useCallback(async () => {
    const accountType = provider
      ? getSocialAccountType(provider, false)
      : AccountType.Metamask;

    track(MetaMetricsEvents.WALLET_CREATION_ATTEMPTED, {
      account_type: accountType,
    });

    try {
      await runWalletCreation(accountType);
    } catch (err) {
      const metricsEnabled = metrics.isEnabled();
      await handleWalletCreationError(err as Error, metricsEnabled);
    }
  }, [provider, track, runWalletCreation, handleWalletCreationError, metrics]);

  useEffect(() => {
    const initBiometrics = async () => {
      const authData = await Authentication.getType();
      await StorageWrapper.getItem(BIOMETRY_CHOICE_DISABLED);
      await StorageWrapper.getItem(PASSCODE_DISABLED);

      const isDevicePasscodeAuth =
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- still returned by Authentication.getType()
        authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE;

      if (isDevicePasscodeAuth) {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- passcodeType expects PASSCODE
        setBiometryType(passcodeType(AUTHENTICATION_TYPE.PASSCODE));
      } else if (authData.availableBiometryType) {
        setBiometryType(authData.availableBiometryType);
      }
    };

    initBiometrics();
  }, []);

  return { loading, foxRiveLoaderRef, startWalletCreation };
};
