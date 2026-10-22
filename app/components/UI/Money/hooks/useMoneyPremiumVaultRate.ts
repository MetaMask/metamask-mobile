import { useSelector } from 'react-redux';
import type { UseQueryResult } from '@tanstack/react-query';
import type { VaultRateResponse } from '@metamask/money-account-api-data-service';
import { useQuery } from '@metamask/react-data-query';
import { selectMoneyAccountPremiumVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import { parseApy, toApyPercent } from '../utils/apy';
import { readVaultAddress } from '../utils/readVaultAddress';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export interface UseMoneyPremiumVaultRateOptions {
  enabled?: boolean;
}

interface UseMoneyPremiumVaultRateResult {
  vaultRateQuery: UseQueryResult<VaultRateResponse>;
  /** Raw vault rate string from the Money API, when the query has one. */
  rate: string | undefined;
  /** Rate as a one-decimal percentage (for example `7.1` for `0.071`). */
  ratePercent: number | undefined;
  /** `ratePercent` with a percent sign (for example `7.1%`). */
  ratePercentFormatted: string | undefined;
}

/**
 * Current rate for the premium vault, shown as the Pro Hub APY.
 *
 * Prefers the Plus subscription's crypto payment `tokenAddress`. After a
 * lapse that field may be gone, so falls back to
 * `moneyAccountPremiumVaultConfig.boringVault` so downgrade APY can still
 * resolve. The chain id always comes from the premium vault config.
 *
 * @param options - Optional enable flag. Defaults to true; when false the
 * query does not run even if a vault address is available.
 * @returns The vault-rate query, the raw rate, and the rate as a percentage.
 */
const useMoneyPremiumVaultRate = ({
  enabled = true,
}: UseMoneyPremiumVaultRateOptions = {}): UseMoneyPremiumVaultRateResult => {
  const plusSubscription = useSelector(selectMoneyAccountPlusSubscription);
  const premiumVaultConfig = useSelector(selectMoneyAccountPremiumVaultConfig);
  const vaultAddress =
    readVaultAddress(plusSubscription?.paymentMethod) ??
    premiumVaultConfig?.boringVault;
  const chainId = premiumVaultConfig
    ? Number(premiumVaultConfig.chainId)
    : undefined;
  const hasValidChainId =
    chainId !== undefined && Number.isSafeInteger(chainId);
  const isEnabled = Boolean(enabled && vaultAddress && hasValidChainId);
  const vaultRateOptions = hasValidChainId ? { chainId } : undefined;

  const vaultRateQuery = useQuery({
    queryKey: [
      MoneyAccountApiDataServiceQueryKeys.FETCH_VAULT_RATE,
      vaultAddress as string,
      { ...vaultRateOptions },
    ],
    enabled: isEnabled,
    refetchInterval: FIVE_MINUTES_MS,
  }) as UseQueryResult<VaultRateResponse>;

  const rate = vaultRateQuery.data?.rate;
  const ratePercent = toApyPercent(parseApy(rate));
  const ratePercentFormatted =
    ratePercent !== undefined ? `${ratePercent}%` : undefined;

  return {
    vaultRateQuery,
    rate,
    ratePercent,
    ratePercentFormatted,
  };
};

export default useMoneyPremiumVaultRate;
