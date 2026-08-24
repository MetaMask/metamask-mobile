import React, { useCallback, useState } from 'react';
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
import { isValidHexAddress } from '../../../../util/address';
import {
  MoneyAccountMigrationPoc,
  type MigrationPhasePrompt,
} from '../../../../lib/Money/migration/MoneyAccountMigrationPocService';
import { STEPPER_IDS } from '../hooks/useOnboardingStep';
import Routes from '../../../../constants/navigation/Routes';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';

export const MONEY_DEV_MIGRATION_DESTINATION_INPUT_TEST_ID =
  'money-dev-migration-destination-input';
export const MONEY_DEV_RUN_MIGRATION_BUTTON_TEST_ID =
  'money-dev-run-migration-button';
export const MONEY_DEV_MIGRATION_STATUS_TEST_ID = 'money-dev-migration-status';

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
  const [destinationAddress, setDestinationAddress] = useState('');
  const [isMigrationRunning, setIsMigrationRunning] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const trimmedDestination = destinationAddress.trim();
  const canRunMigration =
    Boolean(moneyAccountAddress) &&
    isValidHexAddress(trimmedDestination) &&
    trimmedDestination.toLowerCase() !== moneyAccountAddress?.toLowerCase() &&
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
    if (!moneyAccountAddress || !isValidHexAddress(trimmedDestination)) {
      return;
    }
    setIsMigrationRunning(true);
    setMigrationStatus('Migration running…');
    try {
      await MoneyAccountMigrationPoc.migrate({
        source: moneyAccountAddress as Hex,
        destination: trimmedDestination as Hex,
        onBeforePhase: promptBeforeMigrationPhase,
      });
      setMigrationStatus('Migration finished');
      Logger.log('MoneyUiDeveloperOptionsSection: migration POC finished', {
        source: moneyAccountAddress,
        destination: trimmedDestination,
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
    }
  }, [moneyAccountAddress, promptBeforeMigrationPhase, trimmedDestination]);

  const handleRunMigration = useCallback(() => {
    if (!canRunMigration || !moneyAccountAddress) {
      return;
    }
    Alert.alert(
      'Run Money Account migration POC?',
      `Moves funds on Monad from ${moneyAccountAddress} to ${trimmedDestination}. Import the destination private key via Settings → Import Account first. Do not paste a private key here.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Run', onPress: runMigration },
      ],
    );
  }, [canRunMigration, moneyAccountAddress, runMigration, trimmedDestination]);

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
            'POC: migrate Money Account footprint on Monad. Destination must be an address you control. Import its private key via Settings → Import Account, then paste that address here — never paste a private key.'
          }
        </Text>
        <TextField
          placeholder="0x destination address"
          value={destinationAddress}
          onChangeText={setDestinationAddress}
          isDisabled={isMigrationRunning}
          twClassName="w-full"
          style={styles.accessory}
          inputProps={{
            autoCapitalize: 'none',
            autoCorrect: false,
            testID: MONEY_DEV_MIGRATION_DESTINATION_INPUT_TEST_ID,
          }}
        />
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
