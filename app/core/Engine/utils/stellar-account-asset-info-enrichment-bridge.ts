///: BEGIN:ONLY_INCLUDE_IF(stellar)
import type { AccountsControllerAccountAssetListUpdatedEvent } from '@metamask/accounts-controller';
import type { AssetsController } from '@metamask/assets-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import { KnownCaipNamespace, parseCaipAssetType } from '@metamask/utils';

import Logger from '../../../util/Logger';
import {
  enrichAllStellarClassicAccountAssetInfo,
  enrichStellarAccountAssetInfo,
  findAccountsNeedingStellarEnrichment,
  isStellarClassicAssetId,
} from '../../../util/stellar/enrich-stellar-account-asset-info';
import type { RootExtendedMessenger } from '../types';

type AccountAssetListUpdatedPayload =
  AccountsControllerAccountAssetListUpdatedEvent['payload'][0];

type AssetsControllerState = AssetsController['state'];

type StellarAccountAssetInfoEnrichmentBridgeOptions = {
  messenger: RootExtendedMessenger;
  accountsController: {
    getAccount: (accountId: string) => InternalAccount | undefined;
  };
  isEnabled: () => boolean;
};

const STATE_CHANGE_DEBOUNCE_MS = 250;

function getStellarChainIds(assetIds: CaipAssetType[]): CaipChainId[] {
  const chainIds = new Set<CaipChainId>();

  for (const assetId of assetIds) {
    try {
      const { chain } = parseCaipAssetType(assetId);
      if (chain.namespace === KnownCaipNamespace.Stellar) {
        chainIds.add(`${chain.namespace}:${chain.reference}` as CaipChainId);
      }
    } catch {
      // Ignore malformed snap payload entries.
    }
  }

  return [...chainIds];
}

/**
 * Bridges Stellar Snap asset-list updates and AssetsController balance state
 * into client-side `getAccountAssetInfo` enrichment.
 *
 * - `AccountsController:accountAssetListUpdated`: refresh trustline fields for
 *   affected Stellar assets.
 * - `AssetsController:stateChange`: fill missing `accountAssetInfo` after
 *   balances land (cold start / account switch / poll).
 *
 * @param options - Bridge dependencies.
 * @returns A cleanup function that unsubscribes the bridge.
 */
export function startStellarAccountAssetInfoEnrichmentBridge({
  messenger,
  accountsController,
  isEnabled,
}: StellarAccountAssetInfoEnrichmentBridgeOptions): () => void {
  let stateChangeTimer: ReturnType<typeof setTimeout> | undefined;
  let enrichingFromStateChange = false;

  const handleAccountAssetListUpdated = async ({
    assets,
  }: AccountAssetListUpdatedPayload) => {
    if (!isEnabled()) {
      return;
    }

    for (const [accountId, { added, removed }] of Object.entries(assets)) {
      const stellarTouched = [...added, ...removed].filter((assetId) =>
        isStellarClassicAssetId(assetId),
      ) as CaipAssetType[];
      const affectedChainIds = getStellarChainIds(stellarTouched);

      if (affectedChainIds.length === 0) {
        continue;
      }

      try {
        const account = accountsController.getAccount(accountId);
        if (!account) {
          continue;
        }

        for (const chainId of affectedChainIds) {
          await enrichAllStellarClassicAccountAssetInfo(account, chainId, {
            force: true,
          });
        }
      } catch (error) {
        Logger.log(
          error,
          'StellarAccountAssetInfoEnrichmentBridge: failed to refresh after asset list update',
        );
      }
    }
  };

  const enrichMissingFromState = async (state: AssetsControllerState) => {
    if (!isEnabled() || enrichingFromStateChange) {
      return;
    }

    const needingEnrichment = findAccountsNeedingStellarEnrichment(
      state.assetsBalance as Record<
        string,
        Record<
          string,
          { amount?: string; accountAssetInfo?: Record<string, unknown> }
        >
      >,
    );
    if (needingEnrichment.size === 0) {
      return;
    }

    enrichingFromStateChange = true;
    try {
      for (const [accountId, byChain] of needingEnrichment) {
        const account = accountsController.getAccount(accountId);
        if (!account) {
          continue;
        }

        for (const [chainId, assetIds] of byChain) {
          try {
            await enrichStellarAccountAssetInfo({
              account,
              chainId,
              assetIds,
            });
          } catch (error) {
            Logger.log(
              error,
              'StellarAccountAssetInfoEnrichmentBridge: failed to enrich missing accountAssetInfo',
            );
          }
        }
      }
    } finally {
      enrichingFromStateChange = false;
    }
  };

  const handleAssetsControllerStateChange = (state: AssetsControllerState) => {
    if (!isEnabled()) {
      return;
    }

    if (stateChangeTimer) {
      clearTimeout(stateChangeTimer);
    }

    stateChangeTimer = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      enrichMissingFromState(state).catch((error) => {
        Logger.log(
          error,
          'StellarAccountAssetInfoEnrichmentBridge: stateChange enrichment failed',
        );
      });
    }, STATE_CHANGE_DEBOUNCE_MS);
  };

  messenger.subscribe(
    'AccountsController:accountAssetListUpdated',
    handleAccountAssetListUpdated,
  );
  messenger.subscribe(
    'AssetsController:stateChange',
    handleAssetsControllerStateChange,
  );

  return () => {
    if (stateChangeTimer) {
      clearTimeout(stateChangeTimer);
    }
    messenger.unsubscribe(
      'AccountsController:accountAssetListUpdated',
      handleAccountAssetListUpdated,
    );
    messenger.unsubscribe(
      'AssetsController:stateChange',
      handleAssetsControllerStateChange,
    );
  };
}
///: END:ONLY_INCLUDE_IF
