import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { isEvmAccountType } from '@metamask/keyring-api';
import { useNavigation } from '@react-navigation/native';

import { selectSelectedInternalAccount } from '../../selectors/accountsController';
import { TokenI } from '../UI/Tokens/types';
import { handleSendPageNavigation } from '../Views/confirmations/utils/send';

interface UseSendNonEvmAssetParams {
  asset:
    | {
        chainId: string;
        address?: string;
      }
    | TokenI;
}

/**
 * Hook for handling non-EVM asset sending via Snap accounts
 * This consolidates the non-EVM send logic that was duplicated across components
 */
export function useSendNonEvmAsset({ asset }: UseSendNonEvmAssetParams) {
  const navigation = useNavigation();
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const sendNonEvmAsset = useCallback(
    async (location: string): Promise<boolean> => {
      handleSendPageNavigation(navigation.navigate, {
        location,
        asset: asset.address ? (asset as TokenI) : undefined,
      });
      return true;
    },
    [navigation, asset],
  );

  return {
    sendNonEvmAsset,
    isNonEvmAccount: selectedAccount
      ? !isEvmAccountType(selectedAccount.type)
      : false,
  };
}

export default useSendNonEvmAsset;
