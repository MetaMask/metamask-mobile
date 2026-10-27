import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type { PositionResponse } from '@metamask/money-account-api-data-service';
import type { UseQueryResult } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../util/deviceCapability/types';
import {
  selectMoneyAccountPremiumVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectHasMoneyAccountPremiumApyEntitlement } from '../../../../selectors/subscriptionController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import { parseApy, toApyPercent } from '../utils/apy';
import {
  getMoneyVaultState,
  hasPositiveUsd,
  type MoneyVaultKind,
  MoneyVaultStatus,
} from '../utils/moneyVaultState';
import useMoneyPremiumVaultRate from './useMoneyPremiumVaultRate';
import useMoneyVaultApy from './useMoneyVaultApy';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const THIRTY_SECONDS_MS = 30 * 1000;
const SIXTY_SECONDS_MS = 60 * 1000;

/**
 * Positions poll interval for the device-capability matrix.
 *
 * @param isMigrating - Whether vault status is upgrading or downgrading.
 * @param networkTier - Current network tier, or null when unknown.
 * @param hardwareTier - Current hardware tier, or null when unknown.
 * @returns Interval ms, or false to pause polling.
 */
export const getVaultPositionsRefetchInterval = (
  isMigrating: boolean,
  networkTier: NetworkTier | null,
  hardwareTier: HardwareTier | null,
): number | false => {
  if (networkTier === 'NONE') {
    return false;
  }
  if (!isMigrating) {
    return FIVE_MINUTES_MS;
  }
  if (networkTier === 'SLOW_CELLULAR' || hardwareTier === 'LOW') {
    return SIXTY_SECONDS_MS;
  }
  return THIRTY_SECONDS_MS;
};

export interface UseMoneyVaultStateResult {
  status: MoneyVaultStatus;
  currentVault: MoneyVaultKind;
  apyDecimal: number | undefined;
  apyPercent: number | undefined;
  isLoading: boolean;
  positionsQuery: UseQueryResult<PositionResponse>;
}

/**
 * Resolves the Money home vault status and the APY of the vault that currently
 * holds the user's funds.
 *
 * Polls positions faster while a migrate is in flight. Interval follows the
 * device-capability matrix: pause on `NONE`, 60s on `SLOW_CELLULAR` or LOW
 * hardware, 30s otherwise while migrating, and 5 minutes when settled.
 *
 * Loading stays true until every rate that status displays has settled.
 * Standard and upgrading users, and a split downgrade, wait on the base vault
 * APY. Premium-only states do not. A settled query that returns no rate is
 * not loading, so Money home can record that miss.
 *
 * @returns Vault status, current vault kind, effective APY, and loading flag.
 */
const useMoneyVaultState = (): UseMoneyVaultStateResult => {
  const isEntitled = useSelector(selectHasMoneyAccountPremiumApyEntitlement);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const baseVaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const premiumVaultConfig = useSelector(selectMoneyAccountPremiumVaultConfig);
  const networkTier = useNetworkTier();
  const hardwareTier = getHardwareTier();

  const address = primaryMoneyAccount?.address;
  const normalizedAddress = address?.toLowerCase();
  const baseVaultAddress = baseVaultConfig?.boringVault;
  const premiumVaultAddress = premiumVaultConfig?.boringVault;

  const { baseApyDecimal, isBaseApyLoading } = useMoneyVaultApy();
  const [isMigrating, setIsMigrating] = useState(false);

  const refetchInterval = getVaultPositionsRefetchInterval(
    isMigrating,
    networkTier,
    hardwareTier,
  );

  const positionsQuery = useQuery({
    queryKey: [
      MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
      normalizedAddress as string,
    ],
    enabled: Boolean(normalizedAddress),
    refetchInterval,
  }) as UseQueryResult<PositionResponse>;

  const positions = positionsQuery.data?.positions;
  const hasPremiumPosition =
    positions?.some((position) => {
      const matchesAddress =
        premiumVaultAddress !== undefined &&
        position.vault_address?.toLowerCase() ===
          premiumVaultAddress.toLowerCase();
      const matchesKey = position.vault_key === 'premium';
      return (
        (matchesAddress || matchesKey) &&
        hasPositiveUsd(position.current_value_usd)
      );
    }) ?? false;

  const { rate, vaultRateQuery } = useMoneyPremiumVaultRate({
    enabled: isEntitled || hasPremiumPosition,
    vaultAddress: premiumVaultAddress,
  });
  const premiumApyDecimal = parseApy(rate);

  // Only fall back to entitlement when there is no usable positions payload.
  // A refetch error must not discard cached positions, or a mid-migration user
  // would briefly flip to the target vault's APY.
  const positionsUnavailable = positions === undefined;

  const { status, currentVault, effectiveApyDecimal, usesBaseApy } =
    getMoneyVaultState({
      isEntitled,
      positions,
      baseVaultAddress,
      premiumVaultAddress,
      baseApyDecimal,
      premiumApyDecimal,
      positionsUnavailable,
    });

  useEffect(() => {
    setIsMigrating(
      status === MoneyVaultStatus.Upgrading ||
        status === MoneyVaultStatus.Downgrading,
    );
  }, [status]);

  const previousEntitledRef = useRef(isEntitled);
  useEffect(() => {
    const previous = previousEntitledRef.current;
    previousEntitledRef.current = isEntitled;
    if (previous === isEntitled || !normalizedAddress) {
      return;
    }
    Engine.controllerMessenger
      .call('MoneyAccountApiDataService:invalidateQueries', {
        queryKey: [
          MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
          normalizedAddress,
        ],
      })
      .catch(() => {
        // Invalidation is best-effort; the next poll still refreshes.
      });
  }, [isEntitled, normalizedAddress]);

  const isLoading =
    positionsQuery.isLoading ||
    (usesBaseApy && isBaseApyLoading) ||
    ((isEntitled || hasPremiumPosition) &&
      vaultRateQuery.isLoading &&
      premiumApyDecimal === undefined);

  return {
    status,
    currentVault,
    apyDecimal: effectiveApyDecimal,
    apyPercent: toApyPercent(effectiveApyDecimal),
    isLoading,
    positionsQuery,
  };
};

export default useMoneyVaultState;
