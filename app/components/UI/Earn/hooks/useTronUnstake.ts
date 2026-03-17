import { TrxScope } from '@metamask/keyring-api';
import type { CaipAssetType } from '@metamask/snaps-sdk';
import { Hex } from '@metamask/utils';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { TronResourceType } from '../../../../core/Multichain/constants';
import Logger from '../../../../util/Logger';
import { isTronChainId } from '../../../../core/Multichain/utils';
import { selectTronResourcesBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import { selectTrxStakingEnabled } from '../../../../selectors/featureFlagController/trxStakingEnabled';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { TokenI } from '../../Tokens/types';
import { EarnTokenDetails } from '../types/lending.types';
import {
  buildTronEarnTokenIfEligible,
  getStakedTrxTotalFromResources,
} from '../utils/tron';
import {
  computeStakeFee,
  confirmTronUnstake,
  TronUnstakeResult,
  validateTronUnstakeAmount,
} from '../utils/tron-staking-snap';

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
  /** Preview data including fee estimate */
  preview?: Record<string, unknown>;
  /** Validate unstake amount */
  validateUnstakeAmount: (amount: string) => Promise<TronUnstakeResult | null>;
  /** Confirm unstake with current resource type */
  confirmUnstake: (amount: string) => Promise<TronUnstakeResult | null>;
  /** The Tron account ID for balance refresh */
  tronAccountId?: string;
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

  // Determine the staked balance to use for withdrawal
  const stakedBalanceOverride = useMemo(() => {
    if (stakedTrxTotal > 0) return stakedTrxTotal;
    if (token.isStaked) return token.balance;
    return undefined;
  }, [stakedTrxTotal, token.isStaked, token.balance]);

  // Build enriched Tron token with staked balance for withdrawal flow (acts as receipt token)
  const tronWithdrawalToken = useMemo(() => {
    if (!isTronEnabled) return undefined;

    return buildTronEarnTokenIfEligible(token, {
      isTrxStakingEnabled: true,
      isTronEligible: true,
      stakedBalanceOverride,
    });
  }, [isTronEnabled, token, stakedBalanceOverride]) as
    | EarnTokenDetails
    | undefined;

  // Resource type state (energy or bandwidth)
  const [resourceType, setResourceType] = useState<ResourceType>('energy');

  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState<string[] | undefined>(undefined);
  const [preview, setPreview] = useState<Record<string, unknown> | undefined>(
    undefined,
  );

  const chainId = String(token.chainId);

  const validateUnstakeAmount = useCallback<
    UseTronUnstakeReturn['validateUnstakeAmount']
  >(
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

      const { errors: validationErrors, ...rest } = validation ?? {};
      let nextPreview: Record<string, unknown> | undefined =
        rest && Object.keys(rest).length > 0 ? rest : undefined;

      try {
        const feeResult = await computeStakeFee(selectedTronAccount, {
          fromAccountId: selectedTronAccount.id,
          value: amount,
          options: {
            purpose: resourceType.toUpperCase() as
              | TronResourceType.ENERGY
              | TronResourceType.BANDWIDTH,
          },
        });
        if (feeResult.length > 0) {
          const fee = feeResult[0];
          nextPreview = { ...(nextPreview ?? {}), fee };
        }
      } catch (error) {
        Logger.error(
          error as Error,
          '[Tron Unstake] Failed to compute stake fee',
        );
      }

      if (nextPreview) setPreview(nextPreview);
      setErrors(validationErrors);
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
    preview,
    validateUnstakeAmount,
    confirmUnstake,
    tronAccountId: selectedTronAccount?.id,
  };
};

export default useTronUnstake;
