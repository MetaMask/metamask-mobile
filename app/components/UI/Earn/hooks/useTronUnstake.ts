import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { TrxScope } from '@metamask/keyring-api';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import type { CaipAssetType } from '@metamask/snaps-sdk';
import {
  validateTronUnstakeAmount,
  confirmTronUnstake,
  TronUnstakeResult,
} from '../utils/tron-staking';

interface UseTronUnstakeReturn {
  validating: boolean;
  errors?: string[];
  validate: (amount: string, chainId: string) => Promise<TronUnstakeResult | null>;
  confirm: (amount: string, chainId: string) => Promise<TronUnstakeResult | null>;
}

const useTronUnstake = (): UseTronUnstakeReturn => {
  const selectedTronAccount = useSelector(selectSelectedInternalAccountByScope)(
    TrxScope.Mainnet,
  );

  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState<string[] | undefined>(undefined);

  const validate = useCallback<UseTronUnstakeReturn['validate']>(
    async (amount: string, chainId: string) => {
      if (!selectedTronAccount?.id || !chainId) return null;

      setValidating(true);
      setErrors(undefined);

      const assetId = `${chainId}/slip44:195` as CaipAssetType;

      console.log('useTronUnstake - validation 0', amount, chainId, assetId);
      const validation = await validateTronUnstakeAmount(selectedTronAccount, {
        value: amount,
        accountId: selectedTronAccount.id,
        assetId,
      });
      console.log('useTronUnstake - validation 1', validation);

      setErrors(validation?.errors);
      setValidating(false);

      console.log('useTronUnstake - validation 2', validation);
      return validation;
    },
    [selectedTronAccount],
  );

  const confirm = useCallback<UseTronUnstakeReturn['confirm']>(
    async (amount: string, chainId: string) => {
      if (!selectedTronAccount?.id || !chainId) return null;

      setValidating(true);
      setErrors(undefined);
      const assetId = `${chainId}/slip44:195` as CaipAssetType;

      const confirmation = await confirmTronUnstake(selectedTronAccount, {
        value: amount,
        accountId: selectedTronAccount.id,
        assetId,
      });
      setValidating(false);
      setErrors(confirmation?.errors);

      console.log('useTronUnstake - confirmation', confirmation);
      return confirmation;
    },
    [selectedTronAccount],
  );

  return { validating, errors, validate, confirm };
};

export default useTronUnstake;
