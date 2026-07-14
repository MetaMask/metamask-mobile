import { KeyringType } from '@metamask/keyring-api/v2';
import type { HdKeyring } from '@metamask/eth-hd-keyring/v2';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';

import { importNewSecretRecoveryPhrase } from '../../actions/multiSrp';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Routes from '../../constants/navigation/Routes';
import Engine from '../Engine';
import type { AppNavigationProp } from '../NavigationService/types';
import { showAlreadySyncedSheet } from './showAlreadySyncedSheet';
import { showImportFailedSheet } from './showImportFailedSheet';

/**
 * MultichainAccountService historically used
 * "This mnemonic has already been imported." and now throws
 * "This Secret Recovery Phrase has already been imported."
 */
export const DUPLICATE_MNEMONIC_ERROR_MESSAGES = [
  'This mnemonic has already been imported.',
  'This Secret Recovery Phrase has already been imported.',
] as const;

/** @deprecated Prefer DUPLICATE_MNEMONIC_ERROR_MESSAGES + isDuplicateMnemonicError */
export const DUPLICATE_MNEMONIC_ERROR_MESSAGE =
  DUPLICATE_MNEMONIC_ERROR_MESSAGES[0];

/** Prevents Add Device + QR scanner from starting two imports at once. */
let inFlightExistingUserImport: Promise<void> | null = null;

export const isDuplicateMnemonicError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  if (
    DUPLICATE_MNEMONIC_ERROR_MESSAGES.some(
      (knownMessage) => knownMessage === message,
    )
  ) {
    return true;
  }

  return /already been imported/i.test(message);
};

const normalizeMnemonic = (mnemonic: string): string =>
  mnemonic.toLowerCase().trim().replace(/\s+/g, ' ');

const areMnemonicBytesEqual = (
  left: Uint8Array,
  right: Uint8Array,
): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
};

interface HdKeyringMnemonicSource {
  mnemonic?: Uint8Array | number[] | string | null;
}

const doesKeyringHoldMnemonic = (
  keyring: HdKeyringMnemonicSource,
  normalizedMnemonic: string,
  mnemonicBytes: Uint8Array,
): boolean => {
  const existingMnemonic = keyring.mnemonic;
  if (!existingMnemonic) {
    return false;
  }

  if (typeof existingMnemonic === 'string') {
    return normalizeMnemonic(existingMnemonic) === normalizedMnemonic;
  }

  return areMnemonicBytesEqual(
    Uint8Array.from(existingMnemonic),
    mnemonicBytes,
  );
};

/**
 * Returns true when an HD keyring already holds this mnemonic.
 * Prefer this over waiting on MultichainAccountService, which can hang mid-import.
 */
export const isMnemonicAlreadyOnDevice = async (
  mnemonic: string,
): Promise<boolean> => {
  try {
    const normalizedMnemonic = normalizeMnemonic(mnemonic);
    const mnemonicBytes = mnemonicPhraseToBytes(normalizedMnemonic);
    const hdKeyringCount =
      Engine.context.KeyringController.state.keyrings.filter(
        (keyring) => keyring.type === ExtendedKeyringTypes.hd,
      ).length;

    for (let index = 0; index < hdKeyringCount; index += 1) {
      const matches = await Engine.context.KeyringController.withKeyringV2(
        { type: KeyringType.Hd, index },
        async ({ keyring }) =>
          doesKeyringHoldMnemonic(
            keyring as HdKeyring,
            normalizedMnemonic,
            mnemonicBytes,
          ),
      );

      if (matches) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
};

const showAlreadySyncedAndGoHome = (navigation: AppNavigationProp): void => {
  navigation.navigate(Routes.WALLET_VIEW);
  showAlreadySyncedSheet(navigation);
};

const runExistingUserQrSyncImport = async (
  navigation: AppNavigationProp,
  mnemonic: string,
): Promise<void> => {
  try {
    if (await isMnemonicAlreadyOnDevice(mnemonic)) {
      Engine.context.QrSyncController.resetState();
      showAlreadySyncedAndGoHome(navigation);
      return;
    }

    // Do not race import against a timer — Multichain/keyring import cannot be
    // cancelled, and a timeout would leave late vault mutations after failure UI.
    await importNewSecretRecoveryPhrase(mnemonic);
    Engine.context.QrSyncController.resetState();
    navigation.navigate(Routes.WALLET_VIEW);
  } catch (error) {
    Engine.context.QrSyncController.resetState();

    if (isDuplicateMnemonicError(error)) {
      showAlreadySyncedAndGoHome(navigation);
      return;
    }

    navigation.navigate(Routes.WALLET_VIEW);
    showImportFailedSheet(navigation);
  }
};

/**
 * Completes existing-user QR sync by importing the primary mnemonic.
 * Duplicate SRP is surfaced with SuccessErrorSheet and treated as
 * already-synced.
 */
export const completeExistingUserQrSyncImport = async (
  navigation: AppNavigationProp,
  mnemonic: string,
): Promise<void> => {
  if (inFlightExistingUserImport) {
    return inFlightExistingUserImport;
  }

  inFlightExistingUserImport = runExistingUserQrSyncImport(
    navigation,
    mnemonic,
  ).finally(() => {
    inFlightExistingUserImport = null;
  });

  return inFlightExistingUserImport;
};
