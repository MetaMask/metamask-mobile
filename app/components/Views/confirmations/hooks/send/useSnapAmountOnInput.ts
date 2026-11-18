import { useCallback } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipAssetType } from '@metamask/utils';

import { isTronAddress } from '../../../../../core/Multichain/utils';
import { validateTronTransferAmount } from '../../../../../core/Multichain/tron';
import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { validateAmountMultichain } from '../../utils/multichain-snaps';
import { useSendType } from './useSendType';

export const useSnapAmountOnInput = () => {
  const { asset, fromAccount, to } = useSendContext();
  const { isTronSendType } = useSendType();

  const validateAmountWithSnap = useCallback(
    async (amount: string) => {
      const accountId = (fromAccount as InternalAccount).id;
      const assetId = (asset as AssetType)?.assetId as CaipAssetType;

      // The recipient is picked after the amount screen, so the Tron Snap
      // cannot quote fees against it yet. Without it the Snap reserves the
      // account activation cost for an unknown recipient and blocks valid
      // sends, so the fee check is deferred to `confirmSend`, which validates
      // against the real recipient on submit.
      if (isTronSendType) {
        if (!to || !isTronAddress(to)) {
          return { valid: true, errors: [] };
        }
        return await validateTronTransferAmount(
          fromAccount as InternalAccount,
          {
            accountId,
            assetId,
            value: amount,
            toAddress: to,
          },
        );
      }

      const result = await validateAmountMultichain(
        fromAccount as InternalAccount,
        {
          value: amount,
          accountId,
          assetId,
        },
      );
      return result;
    },
    [asset, fromAccount, isTronSendType, to],
  );

  return { validateAmountWithSnap };
};

export interface SnapOnAmountInputResult {
  valid: boolean;
  errors: { code: string }[];
}
