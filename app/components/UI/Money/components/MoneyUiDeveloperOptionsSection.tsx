import React, { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

import { useTheme } from '../../../../util/theme';
import {
  clearMoneyEarnBannerDismissedTokens,
  setMoneyOnboardingSeen,
  setOnboardingStepperStep,
} from '../../../../actions/user';
import {
  selectMoneyEarnBannerDismissedTokens,
  selectMoneyOnboardingSeen,
} from '../../../../reducers/user/selectors';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { useStyles } from '../../../../component-library/hooks';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  TextField,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import styleSheet from '../../../Views/Settings/DeveloperOptions/DeveloperOptions.styles';
import ClipboardManager from '../../../../core/ClipboardManager';
import Logger from '../../../../util/Logger';
import {
  MoneyAccountMigrationPoc,
  type MigrationPhasePrompt,
} from '../../../../lib/Money/migration/MoneyAccountMigrationPocService';
import { deriveAddressFromPrivateKey } from '../../../../lib/Money/migration/MoneyAccountMigrationDelegatedBatch';
import { STEPPER_IDS } from '../hooks/useOnboardingStep';
import Routes from '../../../../constants/navigation/Routes';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';

export const MONEY_DEV_MIGRATION_B_PRIVATE_KEY_INPUT_TEST_ID =
  'money-dev-migration-b-private-key-input';
export const MONEY_DEV_MIGRATION_C_PRIVATE_KEY_INPUT_TEST_ID =
  'money-dev-migration-c-private-key-input';
export const MONEY_DEV_MIGRATION_B_ADDRESS_TEST_ID =
  'money-dev-migration-b-address';
export const MONEY_DEV_MIGRATION_C_ADDRESS_TEST_ID =
  'money-dev-migration-c-address';
export const MONEY_DEV_RUN_MIGRATION_BUTTON_TEST_ID =
  'money-dev-run-migration-button';
export const MONEY_DEV_RUN_MIGRATION_PERF_BUTTON_TEST_ID =
  'money-dev-run-migration-perf-button';
export const MONEY_DEV_MIGRATION_STATUS_TEST_ID = 'money-dev-migration-status';

interface PhaseTiming {
  phase: string;
  durationMs: number;
}

const formatPhaseTimings = (
  timings: PhaseTiming[],
): { summary: string; totalMs: number } => {
  const totalMs = timings.reduce((sum, t) => sum + t.durationMs, 0);
  const summary = [
    ...timings.map((t) => `${t.phase}: ${t.durationMs}ms`),
    `Total: ${totalMs}ms`,
  ].join('\n');
  return { summary, totalMs };
};

export const MoneyUiDeveloperOptionsSection = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const navigation = useNavigation<AppNavigationProp>();

  const hasSeenMoneyOnboarding = useSelector(selectMoneyOnboardingSeen);
  const isOnboardingEnabled = useSelector(
    selectMoneyOnboardingStepperAnimationEnabled,
  );
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const moneyAccountAddress = primaryMoneyAccount?.address;
  const earnBannerDismissedTokens = useSelector(
    selectMoneyEarnBannerDismissedTokens,
  );
  const earnBannerDismissedCount = Object.keys(
    earnBannerDismissedTokens,
  ).length;
  const [bPrivateKey, setBPrivateKey] = useState('');
  const [cPrivateKey, setCPrivateKey] = useState('');
  const [isMigrationRunning, setIsMigrationRunning] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const trimmedBPrivateKey = bPrivateKey.trim();
  const trimmedCPrivateKey = cPrivateKey.trim();
  const bAddress = useMemo(() => {
    if (!trimmedBPrivateKey) {
      return null;
    }
    try {
      return deriveAddressFromPrivateKey(trimmedBPrivateKey);
    } catch {
      return null;
    }
  }, [trimmedBPrivateKey]);
  const cAddress = useMemo(() => {
    if (!trimmedCPrivateKey) {
      return null;
    }
    try {
      return deriveAddressFromPrivateKey(trimmedCPrivateKey);
    } catch {
      return null;
    }
  }, [trimmedCPrivateKey]);
  const canRunMigration =
    Boolean(moneyAccountAddress) &&
    Boolean(bAddress) &&
    Boolean(cAddress) &&
    bAddress?.toLowerCase() !== moneyAccountAddress?.toLowerCase() &&
    cAddress?.toLowerCase() !== moneyAccountAddress?.toLowerCase() &&
    bAddress?.toLowerCase() !== cAddress?.toLowerCase() &&
    !isMigrationRunning;

  const handleResetOnboardingSeenState = useCallback(() => {
    dispatch(setMoneyOnboardingSeen(false));
  }, [dispatch]);

  const handleResetOnboardingStepperStep = useCallback(() => {
    dispatch(setOnboardingStepperStep(STEPPER_IDS.MONEY, 0));
  }, [dispatch]);

  const handleCopyAddress = useCallback(async () => {
    if (moneyAccountAddress) {
      await ClipboardManager.setString(moneyAccountAddress);
    }
  }, [moneyAccountAddress]);

  const handlePreviewFirstTimeDepositAnimation = useCallback(() => {
    navigation.navigate(Routes.MONEY.FIRST_TIME_DEPOSIT);
  }, [navigation]);

  const handleClearEarnBannerDismissals = useCallback(() => {
    dispatch(clearMoneyEarnBannerDismissedTokens());
  }, [dispatch]);

  const clearMigrationKeys = useCallback(() => {
    setBPrivateKey('');
    setCPrivateKey('');
  }, []);

  const promptBeforeMigrationPhase = useCallback<MigrationPhasePrompt>(
    (phase) =>
      new Promise<void>((resolve, reject) => {
        Alert.alert(
          `Migration phase: ${phase}`,
          'Tap Continue to start this phase.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => reject(new Error('migration-debug-cancelled')),
            },
            { text: 'Continue', onPress: () => resolve() },
          ],
          { cancelable: false },
        );
      }),
    [],
  );

  const runMigration = useCallback(async () => {
    if (!moneyAccountAddress || !bAddress || !cAddress) {
      return;
    }
    setIsMigrationRunning(true);
    setMigrationStatus('Migration running…');
    try {
      await MoneyAccountMigrationPoc.migrate({
        source: moneyAccountAddress as Hex,
        destination: bAddress,
        bPrivateKey: trimmedBPrivateKey,
        cPrivateKey: trimmedCPrivateKey,
        onBeforePhase: promptBeforeMigrationPhase,
      });
      setMigrationStatus('Migration finished');
      Logger.log('MoneyUiDeveloperOptionsSection: migration POC finished', {
        source: moneyAccountAddress,
        destination: bAddress,
        submitter: cAddress,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMigrationStatus(`Migration failed: ${message}`);
      Logger.error(
        error instanceof Error ? error : new Error(message),
        'MoneyUiDeveloperOptionsSection: migration POC failed',
      );
    } finally {
      setIsMigrationRunning(false);
      clearMigrationKeys();
    }
  }, [
    bAddress,
    cAddress,
    clearMigrationKeys,
    moneyAccountAddress,
    promptBeforeMigrationPhase,
    trimmedBPrivateKey,
    trimmedCPrivateKey,
  ]);

  const handleRunMigration = useCallback(() => {
    if (!canRunMigration || !moneyAccountAddress) {
      return;
    }
    Alert.alert(
      'Run Money Account migration POC?',
      `Moves all vmUSD from ${moneyAccountAddress} through ${bAddress} and deposits the resulting mUSD back into B. Account C (${cAddress}) submits the atomic batch. Developer POC only; keys are cleared after the run.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Run', onPress: runMigration },
      ],
    );
  }, [bAddress, cAddress, canRunMigration, moneyAccountAddress, runMigration]);

  const runMigrationWithTimings = useCallback(async () => {
    if (!moneyAccountAddress || !bAddress || !cAddress) {
      return;
    }
    setIsMigrationRunning(true);
    setMigrationStatus('Migration running…');

    const timings: PhaseTiming[] = [];
    let currentPhase: string | null = null;
    let phaseStartedAt = 0;

    const closePhase = () => {
      if (currentPhase) {
        timings.push({
          phase: currentPhase,
          durationMs: Date.now() - phaseStartedAt,
        });
        currentPhase = null;
      }
    };

    const recordPhaseStart: MigrationPhasePrompt = async (phase) => {
      closePhase();
      currentPhase = phase;
      phaseStartedAt = Date.now();
    };

    const dumpTimings = (failedMessage?: string) => {
      closePhase();
      const { summary, totalMs } = formatPhaseTimings(timings);
      Logger.log('MoneyUiDeveloperOptionsSection: migration POC timings', {
        timings,
        totalMs,
      });
      if (failedMessage !== undefined) {
        setMigrationStatus(`Migration failed: ${failedMessage}\n${summary}`);
        Alert.alert(
          'Migration phase timings (failed)',
          `${failedMessage}\n\n${summary}`,
        );
        return;
      }
      setMigrationStatus(`Migration finished\n${summary}`);
      Alert.alert('Migration phase timings', summary);
    };

    try {
      await MoneyAccountMigrationPoc.migrate({
        source: moneyAccountAddress as Hex,
        destination: bAddress,
        bPrivateKey: trimmedBPrivateKey,
        cPrivateKey: trimmedCPrivateKey,
        onBeforePhase: recordPhaseStart,
      });
      dumpTimings();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(
        error instanceof Error ? error : new Error(message),
        'MoneyUiDeveloperOptionsSection: migration POC failed',
      );
      dumpTimings(message);
    } finally {
      setIsMigrationRunning(false);
      clearMigrationKeys();
    }
  }, [
    bAddress,
    cAddress,
    clearMigrationKeys,
    moneyAccountAddress,
    trimmedBPrivateKey,
    trimmedCPrivateKey,
  ]);

  const handleRunMigrationWithTimings = useCallback(() => {
    if (!canRunMigration || !moneyAccountAddress) {
      return;
    }
    runMigrationWithTimings();
  }, [canRunMigration, moneyAccountAddress, runMigrationWithTimings]);

  return (
    <Box twClassName="gap-2">
      <Box>
        <Text variant={TextVariant.HeadingLg} style={styles.heading}>
          {'Money UI'}
        </Text>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {`Onboarding enabled: ${String(isOnboardingEnabled)}`}
        </Text>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {`Onboarding seen: ${String(hasSeenMoneyOnboarding)}`}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          style={styles.accessory}
          size={ButtonSize.Lg}
          onPress={handleResetOnboardingSeenState}
          isFullWidth
        >
          {'Reset onboarding screen'}
        </Button>
      </Box>
      <Box>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {`Money Account Address: ${moneyAccountAddress ?? 'N/A'}`}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          style={styles.accessory}
          size={ButtonSize.Lg}
          onPress={handleCopyAddress}
          isDisabled={!moneyAccountAddress}
          isFullWidth
        >
          {'Copy Money Account Address'}
        </Button>
      </Box>
      <Box>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {'Reset Money home onboarding stepper'}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          style={styles.accessory}
          size={ButtonSize.Lg}
          onPress={handleResetOnboardingStepperStep}
          isFullWidth
        >
          {'Reset onboarding stepper'}
        </Button>
      </Box>
      <Box>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {'Preview first-time deposit animation'}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          style={styles.accessory}
          size={ButtonSize.Lg}
          onPress={handlePreviewFirstTimeDepositAnimation}
          isFullWidth
        >
          {'View animation'}
        </Button>
      </Box>
      <Box>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {`Earn banners dismissed: ${earnBannerDismissedCount}`}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          style={styles.accessory}
          size={ButtonSize.Lg}
          onPress={handleClearEarnBannerDismissals}
          isFullWidth
        >
          {'Clear Earn banner dismissals'}
        </Button>
      </Box>
      <Box>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {
            'Developer-only POC: paste the private keys for MFA account B and temporary submitter C. Keys are kept in memory only, never logged or persisted, and cleared after the run.'
          }
        </Text>
        <TextField
          placeholder="Account B private key"
          value={bPrivateKey}
          onChangeText={setBPrivateKey}
          isDisabled={isMigrationRunning}
          twClassName="w-full"
          style={styles.accessory}
          inputProps={{
            autoCapitalize: 'none',
            autoCorrect: false,
            secureTextEntry: true,
            testID: MONEY_DEV_MIGRATION_B_PRIVATE_KEY_INPUT_TEST_ID,
          }}
        />
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
          testID={MONEY_DEV_MIGRATION_B_ADDRESS_TEST_ID}
        >
          {`Account B address: ${bAddress ?? 'Invalid private key'}`}
        </Text>
        <TextField
          placeholder="Account C private key"
          value={cPrivateKey}
          onChangeText={setCPrivateKey}
          isDisabled={isMigrationRunning}
          twClassName="w-full"
          style={styles.accessory}
          inputProps={{
            autoCapitalize: 'none',
            autoCorrect: false,
            secureTextEntry: true,
            testID: MONEY_DEV_MIGRATION_C_PRIVATE_KEY_INPUT_TEST_ID,
          }}
        />
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
          testID={MONEY_DEV_MIGRATION_C_ADDRESS_TEST_ID}
        >
          {`Account C address: ${cAddress ?? 'Invalid private key'}`}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          style={styles.accessory}
          size={ButtonSize.Lg}
          onPress={handleRunMigration}
          isDisabled={!canRunMigration}
          isFullWidth
          testID={MONEY_DEV_RUN_MIGRATION_BUTTON_TEST_ID}
        >
          {isMigrationRunning
            ? 'Migration running…'
            : 'Run Money Account migration POC'}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          style={styles.accessory}
          size={ButtonSize.Lg}
          onPress={handleRunMigrationWithTimings}
          isDisabled={!canRunMigration}
          isFullWidth
          testID={MONEY_DEV_RUN_MIGRATION_PERF_BUTTON_TEST_ID}
        >
          {isMigrationRunning
            ? 'Migration running…'
            : 'Run migration POC (no prompt, log timings)'}
        </Button>
        {migrationStatus ? (
          <Text
            color={TextColor.TextAlternative}
            variant={TextVariant.BodyMd}
            style={styles.desc}
            testID={MONEY_DEV_MIGRATION_STATUS_TEST_ID}
          >
            {migrationStatus}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};
