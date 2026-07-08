import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  resolveFiatDepositRoute,
  type FiatDepositRoute,
} from '@metamask/ramps-controller';
import { selectMoneyDepositEthFallbackEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import { useRampsProviders } from './useRampsProviders';
import { useFiatProviderScope } from '../utils/providerScope';

/**
 * CAIP-19 asset id of native ETH on Ethereum mainnet. This is the convertible
 * fallback asset the deposit buys when no provider serves the target asset
 * directly; a downstream step (Relay + vault/CHOMP) converts it into mUSD. It
 * matches the id `@metamask/transaction-pay-controller` derives for a
 * `moneyAccountDeposit` on the legacy path.
 */
export const ETH_MAINNET_FALLBACK_ASSET_ID = 'eip155:1/slip44:60';

/**
 * Resolves which on-ramp asset the current region should buy for a fiat deposit
 * whose end goal is `preferredAssetId` (e.g. mUSD).
 *
 * When the ETH-fallback flag is off, this only offers the preferred asset
 * directly (current behavior). When it is on, and no provider serves the
 * preferred asset in-region, it falls back to buying native ETH, which a
 * downstream step converts into the target asset.
 *
 * All matching/scope logic lives in `RampsController`'s shared
 * `resolveFiatDepositRoute`, so this hook only wires the Redux-backed provider
 * list and the effective scope into it and cannot disagree with the
 * controller's own provider selection.
 *
 * @param preferredAssetId - CAIP-19 id of the target deposit asset (mUSD).
 * @returns The resolved route, or `undefined` when no asset is purchasable.
 */
export function useFiatDepositRoute(
  preferredAssetId: string,
): FiatDepositRoute | undefined {
  const scope = useFiatProviderScope();
  const { providers } = useRampsProviders();
  const ethFallbackEnabled = useSelector(selectMoneyDepositEthFallbackEnabled);

  return useMemo(
    () =>
      resolveFiatDepositRoute({
        providers,
        preferredAssetId,
        fallbackAssetIds: ethFallbackEnabled
          ? [ETH_MAINNET_FALLBACK_ASSET_ID]
          : [],
        scope,
      }),
    [providers, preferredAssetId, ethFallbackEnabled, scope],
  );
}

export default useFiatDepositRoute;
