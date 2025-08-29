import { CaipAssetType } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { useCallback } from 'react';

import { strings } from '../../../../../../../locales/i18n';
import { AssetType } from '../../../types/token';
import { useSendContext } from '../../../context/send-context';
import { validateAmountMultichain } from '../../../utils/multichain-snaps';

interface SnapValidationResult {
  errors: { code: string }[];
  valid: boolean;
}

export interface ValidateAmountFnArgs {
  amount?: string;
  asset?: AssetType;
  fromAccount: InternalAccount;
}

export const validateAmountFn = async ({
  amount,
  asset,
  fromAccount,
}: ValidateAmountFnArgs) => {
  if (!asset || !amount) {
    return;
  }
  const result = (await validateAmountMultichain(
    fromAccount as InternalAccount,
    {
      value: amount,
      accountId: fromAccount.id,
      assetId: asset.address as CaipAssetType,
    },
  )) as SnapValidationResult;
  const { errors, valid } = result ?? {};
  if (!valid) {
    if (
      errors.some(
        ({ code }: { code: string }) => code === 'InsufficientBalance',
      )
    ) {
      return strings('send.insufficient_funds');
    }
  }
};

export const useNonEvmAmountValidation = () => {
  const { asset, fromAccount, value } = useSendContext();

  const validateNonEvmAmount = useCallback(
    async () =>
      await validateAmountFn({
        amount: value,
        asset: asset as AssetType,
        fromAccount: fromAccount as InternalAccount,
      }),
    [asset, fromAccount, value],
  );

  return { validateNonEvmAmount };
};
