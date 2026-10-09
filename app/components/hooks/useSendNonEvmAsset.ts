import { useCallback, useLayoutEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { isEvmAccountType } from '@metamask/keyring-api';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../core/NavigationService/types';

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
  const navigation = useNavigation<AppNavigationProp>();
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  // Keeps `asset` current without making it a `sendNonEvmAsset` dependency,
  // so callers don't need to memoize it to get a stable reference back.
  const assetRef = useRef(asset);
  useLayoutEffect(() => {
    assetRef.current = asset;
  }, [asset]);

  const sendNonEvmAsset = useCallback(
    async (location: string): Promise<boolean> => {
      const currentAsset = assetRef.current;
      handleSendPageNavigation(navigation.navigate, {
        location,
        asset: currentAsset.address ? (currentAsset as TokenI) : undefined,
      });
      return true;
    },
    [navigation],
  );

  return {
    sendNonEvmAsset,
    isNonEvmAccount: selectedAccount
      ? !isEvmAccountType(selectedAccount.type)
      : false,
  };
}

export default useSendNonEvmAsset;
