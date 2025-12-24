import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { TrxScope } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import Logger from '../../../../util/Logger';
import type { CaipAssetType } from '@metamask/snaps-sdk';
import {
  confirmTronStake,
  validateTronStakeAmount,
  computeStakeFee,
  TronStakeResult,
} from '../utils/tron-staking-snap';
import { TronResourceType } from '../../../../core/Multichain/constants';
import { isTronChainId } from '../../../../core/Multichain/utils';
import { selectTrxStakingEnabled } from '../../../../selectors/featureFlagController/trxStakingEnabled';
import { TokenI } from '../../Tokens/types';

/** Resource type for Tron staking - matches ResourceToggle component type */
export type ResourceType = 'energy' | 'bandwidth';

interface UseTronStakeParams {
  token: TokenI;
}

interface UseTronStakeReturn {
  /** Whether this is a native TRX token eligible for Tron staking */
  isTronNative: boolean;
  /** Whether Tron staking feature is enabled */
  isTronEnabled: boolean;
  /** Selected resource type (ENERGY or BANDWIDTH) */
  resourceType: ResourceType;
  /** Setter for resource type */
  setResourceType: React.Dispatch<React.SetStateAction<ResourceType>>;
  /** Whether validation/confirmation is in progress */
  validating: boolean;
  /** Validation errors if any */
  errors?: string[];
  /** Preview data including fee estimate */
  preview?: Record<string, unknown>;
  /** Validate stake amount */
  validateStakeAmount: (amount: string) => Promise<TronStakeResult | null>;
  /** Confirm stake with current resource type */
  confirmStake: (amount: string) => Promise<TronStakeResult | null>;
  /** The Tron account ID for balance refresh */
  tronAccountId?: string;
}

/**
 * Hook that encapsulates all TRON staking logic:
 * - Derives whether token is native TRX and eligible for staking
 * - Manages resource type state (ENERGY/BANDWIDTH)
 * - Validates and confirms TRON stakes via Snap methods
 */
const useTronStake = ({ token }: UseTronStakeParams): UseTronStakeReturn => {
  const selectedTronAccount = useSelector(selectSelectedInternalAccountByScope)(
    TrxScope.Mainnet,
  );
  const isTrxStakingEnabled = useSelector(selectTrxStakingEnabled);

  // Derive whether token is native TRX
  const isTronNative = useMemo(
    () =>
      Boolean(token.isNative && isTronChainId(String(token.chainId) as Hex)),
    [token.isNative, token.chainId],
  );

  // Tron staking is enabled when both flag is on and token is native TRX
  const isTronEnabled = Boolean(isTrxStakingEnabled && isTronNative);

  // Resource type state (energy or bandwidth)
  const [resourceType, setResourceType] = useState<ResourceType>('energy');

  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState<string[] | undefined>(undefined);
  const [preview, setPreview] = useState<Record<string, unknown> | undefined>(
    undefined,
  );

  const chainId = String(token.chainId);

  const validateStakeAmount = useCallback<
    UseTronStakeReturn['validateStakeAmount']
  >(
    async (amount: string) => {
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
        const feeResult = await computeStakeFee(selectedTronAccount, {
          fromAccountId: selectedTronAccount.id,
          value: amount,
          options: { purpose: resourceType.toUpperCase() as TronResourceType },
        });
        if (feeResult.length > 0) {
          const fee = feeResult[0];
          nextPreview = { ...(nextPreview ?? {}), fee };
        }
      } catch (error) {
        Logger.error(
          error as Error,
          '[Tron Stake] Failed to compute stake fee',
        );
      }

      if (nextPreview) setPreview(nextPreview);
      setErrors(validationErrors);
      setValidating(false);

      return validation;
    },
    [selectedTronAccount, chainId, resourceType],
  );

  const confirmStake = useCallback<UseTronStakeReturn['confirmStake']>(
    async (amount: string) => {
      if (!selectedTronAccount?.id || !chainId) return null;

      setValidating(true);
      setErrors(undefined);
      const assetId = `${chainId}/slip44:195` as CaipAssetType;

      const confirmation = await confirmTronStake(selectedTronAccount, {
        fromAccountId: selectedTronAccount.id,
        assetId,
        value: amount,
        options: { purpose: resourceType.toUpperCase() as TronResourceType },
      });
      setValidating(false);
      setErrors(confirmation?.errors);

      return confirmation;
    },
    [selectedTronAccount, chainId, resourceType],
  );

  return {
    isTronNative,
    isTronEnabled,
    resourceType,
    setResourceType,
    validating,
    errors,
    preview,
    validateStakeAmount,
    confirmStake,
    tronAccountId: selectedTronAccount?.id,
  };
};

export default useTronStake;
