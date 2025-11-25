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
import { TronResourceType } from '../../../../core/Multichain/constants';

type Purpose = TronResourceType.ENERGY | TronResourceType.BANDWIDTH;

interface UseTronUnstakeReturn {
  validating: boolean;
  errors?: string[];
  validate: (
    amount: string,
    purpose: Purpose,
    chainId: string,
  ) => Promise<TronUnstakeResult | null>;
  confirm: (
    amount: string,
    purpose: Purpose,
    chainId: string,
  ) => Promise<TronUnstakeResult | null>;
}

const useTronUnstake = (): UseTronUnstakeReturn => {
  const selectedTronAccount = useSelector(selectSelectedInternalAccountByScope)(
    TrxScope.Mainnet,
  );

  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState<string[] | undefined>(undefined);

  const validate = useCallback<UseTronUnstakeReturn['validate']>(
    async (amount: string, purpose: Purpose, chainId: string) => {
      if (!selectedTronAccount?.id || !chainId) return null;

      setValidating(true);
      setErrors(undefined);

      const assetId = `${chainId}/slip44:195` as CaipAssetType;

      const validation = await validateTronUnstakeAmount(selectedTronAccount, {
        value: amount,
        accountId: selectedTronAccount.id,
        assetId,
        options: { purpose: purpose.toUpperCase() as TronResourceType },
      });

      setErrors(validation?.errors);
      setValidating(false);

      return validation;
    },
    [selectedTronAccount],
  );

  const confirm = useCallback<UseTronUnstakeReturn['confirm']>(
    async (amount: string, purpose: Purpose, chainId: string) => {
      if (!selectedTronAccount?.id || !chainId) return null;

      setValidating(true);
      setErrors(undefined);
      const assetId = `${chainId}/slip44:195` as CaipAssetType;

      const confirmation = await confirmTronUnstake(selectedTronAccount, {
        value: amount,
        accountId: selectedTronAccount.id,
        assetId,
        options: { purpose: purpose.toUpperCase() as TronResourceType },
      });
      setValidating(false);
      setErrors(confirmation?.errors);

      return confirmation;
    },
    [selectedTronAccount],
  );

  return { validating, errors, validate, confirm };
};

export default useTronUnstake;
