import { useMemo } from 'react';
import { toCaipAssetType } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { useEnsureProviderForAsset } from '../../../../UI/Ramp/hooks/useEnsureProviderForAsset';
import { providerSupportsAsset } from '../../../../UI/Ramp/utils/providerSupportsAsset';
import { useRampsController } from '../../../../UI/Ramp/hooks/useRampsController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import { hasTransactionType } from '../../utils/transaction';

/**
 * Transaction types that should pick the best Ramps provider for the asset
 * they require. Money Account is intentionally excluded — it is hard-locked
 * to a single provider (see {@link useFiatRouteProviderAvailability}).
 */
const ASSET_BASED_TRANSACTION_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
] as const;

/**
 * Wires {@link useEnsureProviderForAsset} into MM Pay surfaces whose required
 * funding asset is determined at runtime from `requiredTokens`. When the
 * bootstrap selected a provider that can't fulfill the asset (e.g. a US-NY
 * user with no Transak Native who lands on Perps deposit needing USDC on
 * Arbitrum), this hook silently switches to any provider that can.
 *
 * Surfaces themselves (e.g. CustomAmountInfo) handle the "no provider
 * supports this asset" case via the existing `BuySection` empty state, so
 * we pass an `onNoSupportingProvider` no-op to suppress the default
 * Ramp modal navigation — that modal lives inside the Ramp navigator and
 * isn't safely reachable from confirmation screens.
 */
export function useEnsureProviderForPayAsset(): void {
  const transactionMeta = useTransactionMetadataRequest();
  const requiredTokens = useTransactionPayRequiredTokens();
  const { selectedProvider, paymentMethodsStatus, paymentMethodsFetching } =
    useRampsController();

  const isAssetBasedTransaction = hasTransactionType(transactionMeta, [
    ...ASSET_BASED_TRANSACTION_TYPES,
  ]);

  const assetId = useMemo(() => {
    if (!isAssetBasedTransaction) return undefined;
    const primaryRequiredToken = (requiredTokens ?? []).find(
      (token) => token.address !== getNativeTokenAddress(token.chainId),
    );
    if (!primaryRequiredToken) return undefined;
    return toCaipAssetType(
      'eip155',
      Number(primaryRequiredToken.chainId).toString(),
      'erc20',
      primaryRequiredToken.address,
    );
  }, [isAssetBasedTransaction, requiredTokens]);

  // Mirrors BuildQuote's `isTokenUnavailable` derivation but limited to the
  // signals available outside the Buy flow: we only know the selected
  // provider doesn't support the asset, not whether its payment methods
  // are empty. That's sufficient to trigger a switch when one is needed.
  const isTokenUnavailable = useMemo(() => {
    if (!selectedProvider || !assetId) return false;
    if (paymentMethodsStatus !== 'success' || paymentMethodsFetching) {
      return false;
    }
    return !providerSupportsAsset(selectedProvider, assetId);
  }, [selectedProvider, assetId, paymentMethodsStatus, paymentMethodsFetching]);

  useEnsureProviderForAsset({
    enabled: isAssetBasedTransaction,
    assetId,
    isTokenUnavailable,
    onNoSupportingProvider: noop,
  });
}

function noop() {
  /* no-op: MM Pay handles the unsupported-asset case via its own empty
   * state, not the Ramp `TokenNotAvailableModal`. */
}
