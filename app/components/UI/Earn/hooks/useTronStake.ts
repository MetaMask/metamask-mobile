import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { TrxScope } from '@metamask/keyring-api';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import type { CaipAssetType } from '@metamask/snaps-sdk';
import {
  confirmTronStake,
  validateTronStakeAmount,
  TronStakeResult,
} from '../utils/tron-staking';
import { TronResourceType } from '../../../../core/Multichain/constants';

type Purpose = TronResourceType.ENERGY | TronResourceType.BANDWIDTH;

interface UseTronStakeReturn {
  validating: boolean;
  errors?: string[];
  preview?: Record<string, unknown>;
  validate: (
    amount: string,
    chainId: string,
  ) => Promise<TronStakeResult | null>;
  confirm: (
    amount: string,
    purpose: Purpose,
    chainId: string,
  ) => Promise<TronStakeResult | null>;
}

/**
 * Hook that validates and confirms a TRON stake via Snap methods.
 * - Builds CAIP-19 assetId for native TRX using provided chainId
 */
const useTronStake = (): UseTronStakeReturn => {
  const selectedTronAccount = useSelector(selectSelectedInternalAccountByScope)(
    TrxScope.Mainnet,
  );

  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState<string[] | undefined>(undefined);
  const [preview, setPreview] = useState<Record<string, unknown> | undefined>(
    undefined,
  );

  const validate = useCallback<UseTronStakeReturn['validate']>(
    async (amount: string, chainId: string) => {
      if (!selectedTronAccount?.id || !chainId) return null;

      setValidating(true);
      setErrors(undefined);

      const assetId = `${chainId}/slip44:195` as CaipAssetType;

      const validation = await validateTronStakeAmount(selectedTronAccount, {
        value: amount,
        accountId: selectedTronAccount.id,
        assetId,
      });

      const { errors: validationErrors, ...rest } = validation ?? {};
      let nextPreview: Record<string, unknown> | undefined =
        rest && Object.keys(rest).length > 0 ? rest : undefined;

      try {
        // const fee = await computeTronFee(selectedTronAccount, {
        //   transaction: 'stake',
        //   accountId: selectedTronAccount.id,
        //   scope: chainId,
        // });
        const fee = {
          type: 'fee',
          asset: {
            unit: 'TRX',
            type: 'TRX',
            amount: '0.01',
            fungible: true,
          },
        };
        nextPreview = { ...(nextPreview ?? {}), fee };
      } catch {
        // ignore for now
      }

      if (nextPreview) setPreview(nextPreview);
      setErrors(validationErrors);
      setValidating(false);

      return validation;
    },
    [selectedTronAccount],
  );

  const confirm = useCallback<UseTronStakeReturn['confirm']>(
    async (amount: string, purpose: Purpose, chainId: string) => {
      if (!selectedTronAccount?.id || !chainId) return null;

      setValidating(true);
      setErrors(undefined);
      const assetId = `${chainId}/slip44:195` as CaipAssetType;

      const confirmation = await confirmTronStake(selectedTronAccount, {
        fromAccountId: selectedTronAccount.id,
        assetId,
        value: amount,
        options: { purpose: purpose.toUpperCase() as TronResourceType },
      });
      setValidating(false);
      setErrors(confirmation?.errors);

      return confirmation;
    },
    [selectedTronAccount],
  );

  return { validating, errors, preview, validate, confirm };
};

export default useTronStake;
