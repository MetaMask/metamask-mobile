import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { SnapId } from '@metamask/snaps-sdk';
import { CaipChainId, CaipAssetType } from '@metamask/utils';
import { isEvmAccountType } from '@metamask/keyring-api';
import { useNavigation } from '@react-navigation/native';

import { selectSelectedInternalAccount } from '../../selectors/accountsController';
import { isMultichainWalletSnap } from '../../core/SnapKeyring/utils/snaps';
import { sendMultichainTransaction } from '../../core/SnapKeyring/utils/sendMultichainTransaction';
import Logger from '../../util/Logger';
import { TokenI } from '../UI/Tokens/types';
import {
  handleSendPageNavigation,
  isSendRedesignEnabled,
} from '../Views/confirmations/utils/send';

interface UseSendNonEvmAssetParams {
  asset:
    | {
        chainId: string;
        address?: string;
      }
    | TokenI;
  closeModal?: () => void;
}

/**
 * Hook for handling non-EVM asset sending via Snap accounts
 * This consolidates the non-EVM send logic that was duplicated across components
 */
export function useSendNonEvmAsset({
  asset,
  closeModal,
}: UseSendNonEvmAssetParams) {
  const navigation = useNavigation();
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const sendNonEvmAsset = useCallback(async (): Promise<boolean> => {
    // Check if this is a non-EVM account
    if (!selectedAccount || isEvmAccountType(selectedAccount.type)) {
      return false; // Not a non-EVM account, let caller handle EVM logic
    }

    // Close modal if provided
    if (closeModal) {
      closeModal();
    }

    if (isSendRedesignEnabled()) {
      handleSendPageNavigation(
        navigation.navigate,
        asset.address ? (asset as TokenI) : undefined,
      );
      return true;
    }

    // Validate snap account
    if (!selectedAccount.metadata.snap) {
      Logger.error(
        new Error('Non-EVM needs to be Snap accounts'),
        'useSendNonEvmAsset',
      );
      return true; // Handled (even if with error)
    }

    if (!isMultichainWalletSnap(selectedAccount.metadata.snap.id as SnapId)) {
      Logger.error(
        new Error(
          `Non-EVM Snap is not whitelisted: ${selectedAccount.metadata.snap.id}`,
        ),
        'useSendNonEvmAsset',
      );
      return true; // Handled (even if with error)
    }

    // Send the multichain transaction
    try {
      await sendMultichainTransaction(
        selectedAccount.metadata.snap.id as SnapId,
        {
          account: selectedAccount.id,
          scope: asset.chainId as CaipChainId,
          assetId: asset.address as CaipAssetType,
        },
      );
      Logger.log('Successfully sent non-EVM transaction', 'useSendNonEvmAsset');
    } catch (error) {
      Logger.error(
        error as Error,
        'useSendNonEvmAsset: Error sending multichain transaction',
      );
    }

    return true; // Successfully handled non-EVM case
  }, [selectedAccount, asset, closeModal, navigation]);

  return {
    sendNonEvmAsset,
    isNonEvmAccount: selectedAccount
      ? !isEvmAccountType(selectedAccount.type)
      : false,
  };
}

export default useSendNonEvmAsset;
