import { importNewSecretRecoveryPhrase } from '../../actions/multiSrp';
import Routes from '../../constants/navigation/Routes';
import Engine from '../Engine';
import type { AppNavigationProp } from '../NavigationService/types';

export const completeExistingUserQrSyncImport = async (
  navigation: AppNavigationProp,
  mnemonic: string,
): Promise<void> => {
  try {
    await importNewSecretRecoveryPhrase(mnemonic);
    Engine.context.QrSyncController.resetState();
    navigation.navigate(Routes.WALLET_VIEW);
  } catch (error) {
    Engine.context.QrSyncController.resetState();
    throw error;
  }
};
