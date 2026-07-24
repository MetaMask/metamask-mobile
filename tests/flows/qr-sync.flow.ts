import {
  E2EDeeplinkSchemes,
  resolveE2EWaitTimeoutMs,
} from '../framework/Constants';
import { openE2EUrl } from '../framework/DeepLink';
import Assertions from '../framework/Assertions';
import OnboardingView from '../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../page-objects/Onboarding/OnboardingSheet';
import ImportWalletView from '../page-objects/Onboarding/ImportWalletView';
import CreatePasswordView from '../page-objects/Onboarding/CreatePasswordView';
import MetaMetricsOptInView from '../page-objects/Onboarding/MetaMetricsOptInView';
import AddDeviceToWalletView from '../page-objects/Onboarding/AddDeviceToWalletView';
import AddWalletView from '../page-objects/Onboarding/AddWalletView';
import AccountListBottomSheet from '../page-objects/wallet/AccountListBottomSheet';
import WalletView from '../page-objects/wallet/WalletView';
import { FrameworkDetector } from '../framework/FrameworkDetector';
import type CommandQueueServer from '../framework/fixtures/CommandQueueServer';
import { E2ECommandTypes } from '../framework/types';
import { sleep } from '../framework/Utilities';
import ExperienceEnhancerBottomSheet from '../page-objects/Onboarding/ExperienceEnhancerBottomSheet';
import OnboardingSuccessView from '../page-objects/Onboarding/OnboardingSuccessView';
import {
  closeOnboardingModals,
  dismissExperienceEnhancerModal,
  dismissOnboardingInterestQuestionnaire,
  dismissPushNotificationExistingUserSheet,
  loginToApp,
  loginToAppPlaywright,
  waitForWalletHomePlaywright,
} from './wallet.flow';
import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
  IDENTITY_TEAM_SEED_PHRASE_2,
} from '../smoke/identity/utils/constants';

const SEEDLESS_ONBOARDING_ENABLED =
  process.env.SEEDLESS_ONBOARDING_ENABLED === 'true' ||
  process.env.SEEDLESS_ONBOARDING_ENABLED === undefined;

export const QR_SYNC_EXTENSION_WALLET_NAME = 'Extension Wallet';
export const QR_SYNC_EXTENSION_ACCOUNT_NAME = 'Synced Account';

export interface ApplyQrSyncSrpOptions {
  mnemonic: string;
  isPrimary?: boolean;
  walletName?: string;
  accountName?: string;
  /** Prefer command queue on Appium — deep links are unreliable for warm RN sessions. */
  commandQueueServer?: CommandQueueServer;
}

/**
 * Injects an SRP sync-ready payload via command queue (preferred) or E2E deep link.
 * Requires HAS_TEST_OVERRIDES and the Add Device screen mounted so
 * useQrSyncImportNavigation can continue the flow.
 */
export const applyQrSyncSrpReadyPayload = async ({
  mnemonic,
  isPrimary = true,
  walletName = QR_SYNC_EXTENSION_WALLET_NAME,
  accountName = QR_SYNC_EXTENSION_ACCOUNT_NAME,
  commandQueueServer,
}: ApplyQrSyncSrpOptions): Promise<void> => {
  if (commandQueueServer) {
    commandQueueServer.addToQueue({
      type: E2ECommandTypes.applyQrSyncSyncReady,
      args: {
        mnemonic,
        isPrimary,
        walletName,
        accountName,
      },
    });
    // App polls /queue.json every ~2s
    await sleep(2_500);
    return;
  }

  // Prefer encodeURIComponent over URLSearchParams so Android
  // Intent / Appium mobile:deepLink deliver a stable query string.
  const query = [
    `mnemonic=${encodeURIComponent(mnemonic)}`,
    `isPrimary=${encodeURIComponent(String(isPrimary))}`,
    `walletName=${encodeURIComponent(walletName)}`,
    `accountName=${encodeURIComponent(accountName)}`,
  ].join('&');
  await openE2EUrl(`${E2EDeeplinkSchemes.QR_SYNC}apply-sync-ready?${query}`);
};

/**
 * New-user path: onboarding → Import SRP → extension link → inject sync-ready
 * → create password → MetaMetrics → wallet home.
 */
export const completeNewUserQrSyncSrp = async ({
  mnemonic = IDENTITY_TEAM_SEED_PHRASE,
  password = IDENTITY_TEAM_PASSWORD,
  optInToMetrics = true,
  commandQueueServer,
}: {
  mnemonic?: string;
  password?: string;
  optInToMetrics?: boolean;
  commandQueueServer?: CommandQueueServer;
} = {}): Promise<void> => {
  await Assertions.expectElementToBeVisible(
    OnboardingView.existingWalletButton,
    {
      description: 'Have an existing wallet button should be visible',
    },
  );
  await OnboardingView.tapHaveAnExistingWallet();

  if (SEEDLESS_ONBOARDING_ENABLED) {
    await OnboardingSheet.tapImportSeedButton();
  }

  await Assertions.expectElementToBeVisible(ImportWalletView.container, {
    description: 'Import from seed screen should be visible',
  });
  await ImportWalletView.tapImportFromExtensionLink();
  await AddDeviceToWalletView.expectScreenVisible();

  await applyQrSyncSrpReadyPayload({
    mnemonic,
    isPrimary: true,
    walletName: QR_SYNC_EXTENSION_WALLET_NAME,
    accountName: QR_SYNC_EXTENSION_ACCOUNT_NAME,
    commandQueueServer,
  });

  await Assertions.expectElementToBeVisible(
    CreatePasswordView.newPasswordInput,
    {
      description: 'Create password fields should open after QR sync inject',
      timeout: 30_000,
    },
  );
  await CreatePasswordView.enterPassword(password);
  await CreatePasswordView.reEnterPassword(password);
  await CreatePasswordView.tapIUnderstandCheckBox();
  await CreatePasswordView.tapCreatePasswordButton();

  await Assertions.expectElementToBeVisible(MetaMetricsOptInView.container, {
    description: 'MetaMetrics Opt-In should be visible',
  });
  if (!optInToMetrics) {
    await MetaMetricsOptInView.tapMetricsCheckbox();
  }
  await MetaMetricsOptInView.tapAgreeButton();

  if (optInToMetrics) {
    await dismissOnboardingInterestQuestionnaire();

    try {
      await ExperienceEnhancerBottomSheet.tapIAgree();
    } catch {
      // Optional post-metrics sheet
    }
    try {
      await Assertions.expectElementToBeVisible(
        OnboardingSuccessView.container,
        {
          description: 'Onboarding success may appear after QR sync import',
          timeout: 5_000,
        },
      );
      await OnboardingSuccessView.tapDone();
    } catch {
      // Some builds go straight to wallet home
    }
    await dismissPushNotificationExistingUserSheet();
    await dismissExperienceEnhancerModal();
    await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(60_000));
  }
  await closeOnboardingModals(false);
};

/**
 * Existing-user path: login → Add Wallet → Link extension → inject sync-ready
 * → wallet home with one additional SRP imported.
 *
 */
export const completeExistingUserQrSyncSrp = async ({
  mnemonic = IDENTITY_TEAM_SEED_PHRASE_2,
  commandQueueServer,
}: {
  mnemonic?: string;
  commandQueueServer?: CommandQueueServer;
} = {}): Promise<void> => {
  if (FrameworkDetector.isAppium()) {
    await loginToAppPlaywright({ scenarioType: 'e2e' });
  } else {
    await loginToApp();
  }
  await WalletView.tapIdenticon();
  await Assertions.expectElementToBeVisible(
    AccountListBottomSheet.accountList,
    {
      description: 'Account list should be visible',
    },
  );
  await AccountListBottomSheet.tapAddWalletButton();
  await AddWalletView.expectScreenVisible();
  await AddWalletView.tapLinkMetaMaskExtension();
  await AddDeviceToWalletView.expectScreenVisible();

  await applyQrSyncSrpReadyPayload({
    mnemonic,
    // Existing-user path accepts any mnemonic; keep primary for clarity.
    isPrimary: true,
    walletName: QR_SYNC_EXTENSION_WALLET_NAME,
    accountName: QR_SYNC_EXTENSION_ACCOUNT_NAME,
    commandQueueServer,
  });

  await dismissPushNotificationExistingUserSheet();
  await dismissExperienceEnhancerModal();
  await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(60_000));
};
