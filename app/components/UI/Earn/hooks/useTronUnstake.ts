import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { TrxScope } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import type { CaipAssetType } from '@metamask/snaps-sdk';
import {
  validateTronUnstakeAmount,
  confirmTronUnstake,
  TronUnstakeResult,
} from '../utils/tron-staking-snap';
import { TronResourceType } from '../../../../core/Multichain/constants';
import { isTronChainId } from '../../../../core/Multichain/utils';
import { selectTrxStakingEnabled } from '../../../../selectors/featureFlagController/trxStakingEnabled';
import { selectTronResourcesBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import { TokenI } from '../../Tokens/types';
import {
  getStakedTrxTotalFromResources,
  buildTronEarnTokenIfEligible,
} from '../utils/tron';
import { EarnTokenDetails } from '../types/lending.types';

/** Resource type for Tron unstaking - matches ResourceToggle component type */
export type ResourceType = 'energy' | 'bandwidth';

interface UseTronUnstakeParams {
  token: TokenI;
}

interface UseTronUnstakeReturn {
  /** Whether this is a Tron chain token */
  isTronAsset: boolean;
  /** Whether Tron unstaking is enabled for this token */
  isTronEnabled: boolean;
  /** Selected resource type (energy or bandwidth) */
  resourceType: ResourceType;
  /** Setter for resource type */
  setResourceType: React.Dispatch<React.SetStateAction<ResourceType>>;
  /** Total staked TRX from resources */
  stakedTrxTotal: number;
  /** Enriched Tron token with staked balance for withdrawal flow (acts as receipt token) */
  tronWithdrawalToken: EarnTokenDetails | undefined;
  /** Whether validation/confirmation is in progress */
  validating: boolean;
  /** Validation errors if any */
  errors?: string[];
  /** Validate unstake amount */
  validate: (amount: string) => Promise<TronUnstakeResult | null>;
  /** Confirm unstake with current resource type */
  confirmUnstake: (amount: string) => Promise<TronUnstakeResult | null>;
}

/**
 * Hook that encapsulates all TRON unstaking logic:
 * - Derives whether token is on Tron chain and eligible for unstaking
 * - Manages resource type state (ENERGY/BANDWIDTH)
 * - Computes staked TRX total from resources
 * - Validates and confirms TRON unstakes via Snap methods
 */
const useTronUnstake = ({
  token,
}: UseTronUnstakeParams): UseTronUnstakeReturn => {
  const selectedTronAccount = useSelector(selectSelectedInternalAccountByScope)(
    TrxScope.Mainnet,
  );
  const isTrxStakingEnabled = useSelector(selectTrxStakingEnabled);
  const tronResources = useSelector(selectTronResourcesBySelectedAccountGroup);

  // Derive whether token is on Tron chain
  const isTronAsset = useMemo(
    () => Boolean(isTronChainId(String(token.chainId) as Hex)),
    [token.chainId],
  );

  // Tron unstaking is enabled when both flag is on and token is on Tron chain
  const isTronEnabled = Boolean(isTrxStakingEnabled && isTronAsset);

  // Compute staked TRX total from resources
  const stakedTrxTotal = useMemo(
    () => (isTronEnabled ? getStakedTrxTotalFromResources(tronResources) : 0),
    [isTronEnabled, tronResources],
  );

  // Build enriched Tron token with staked balance for withdrawal flow (acts as receipt token)
  const tronWithdrawalToken = useMemo(() => {
    if (!isTronEnabled) return undefined;

    return buildTronEarnTokenIfEligible(token, {
      isTrxStakingEnabled: true,
      isTronEligible: true,
      stakedBalanceOverride:
        stakedTrxTotal > 0
          ? stakedTrxTotal
          : token.isStaked
            ? token.balance
            : undefined,
    });
  }, [isTronEnabled, token, stakedTrxTotal]) as EarnTokenDetails | undefined;

  // Resource type state (energy or bandwidth)
  const [resourceType, setResourceType] = useState<ResourceType>('energy');

  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState<string[] | undefined>(undefined);

  const chainId = String(token.chainId);

  const validate = useCallback<UseTronUnstakeReturn['validate']>(
    async (amount: string) => {
      if (!selectedTronAccount?.id || !chainId) return null;

      setValidating(true);
      setErrors(undefined);

      const assetId = `${chainId}/slip44:195` as CaipAssetType;

      const validation = await validateTronUnstakeAmount(selectedTronAccount, {
        value: amount,
        accountId: selectedTronAccount.id,
        assetId,
        options: { purpose: resourceType.toUpperCase() as TronResourceType },
      });

      setErrors(validation?.errors);
      setValidating(false);

      return validation;
    },
    [selectedTronAccount, chainId, resourceType],
  );

  const confirmUnstake = useCallback<UseTronUnstakeReturn['confirmUnstake']>(
    async (amount: string) => {
      if (!selectedTronAccount?.id || !chainId) return null;

      setValidating(true);
      setErrors(undefined);
      const assetId = `${chainId}/slip44:195` as CaipAssetType;

      const confirmation = await confirmTronUnstake(selectedTronAccount, {
        value: amount,
        accountId: selectedTronAccount.id,
        assetId,
        options: { purpose: resourceType.toUpperCase() as TronResourceType },
      });
      setValidating(false);
      setErrors(confirmation?.errors);

      return confirmation;
    },
    [selectedTronAccount, chainId, resourceType],
  );

  return {
    isTronAsset,
    isTronEnabled,
    resourceType,
    setResourceType,
    stakedTrxTotal,
    tronWithdrawalToken,
    validating,
    errors,
    validate,
    confirmUnstake,
  };
};

export default useTronUnstake;
