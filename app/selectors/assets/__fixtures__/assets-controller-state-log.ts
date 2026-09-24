import type { AssetsControllerState } from '@metamask/assets-controller';
import { KnownCaipNamespace, type CaipAssetType } from '@metamask/utils';
import stateLogJson from './assets-controller-state-log.json';

const EIP155_PREFIX = `${KnownCaipNamespace.Eip155}:`;
const TRON_PREFIX = `${KnownCaipNamespace.Tron}:`;

export const stateLog = stateLogJson;

export const assetsControllerStateLog =
  stateLog.AssetsController as unknown as AssetsControllerState;

const wallets = stateLog.AccountTreeController.accountTree.wallets;
const walletIds = Object.keys(wallets);

if (walletIds.length !== 1) {
  throw new Error(
    `Expected the state log to contain exactly one wallet, found ${walletIds.length}`,
  );
}

export const WALLET_ID = walletIds[0];
export const GROUP_ID = stateLog.AccountTreeController.selectedAccountGroup;
export const USER_CURRENCY = assetsControllerStateLog.selectedCurrency;

const { assetsBalance, assetsInfo, assetsPrice } = assetsControllerStateLog;

const accountIdForAssetPrefix = (prefix: string): string => {
  const accountId = Object.keys(assetsBalance).find((id) =>
    Object.keys(assetsBalance[id]).some((assetId) =>
      assetId.startsWith(prefix),
    ),
  );

  if (!accountId) {
    throw new Error(`No account in the state log has ${prefix} balances`);
  }

  return accountId;
};

export const EVM_ACCOUNT_ID = accountIdForAssetPrefix(EIP155_PREFIX);
export const TRON_ACCOUNT_ID = accountIdForAssetPrefix(TRON_PREFIX);

const evmAccountBalances = assetsBalance[EVM_ACCOUNT_ID];
const tronAccountBalances = assetsBalance[TRON_ACCOUNT_ID];

/** Optimism ERC-20 balances present in `assetsBalance` but absent from `assetsInfo`. */
export const ORPHAN_EVM_ASSET_IDS = (
  Object.entries(evmAccountBalances) as [CaipAssetType, { amount: string }][]
)
  .filter(
    ([assetId, balance]) =>
      assetId.startsWith(EIP155_PREFIX) &&
      Number(balance.amount) > 0 &&
      assetsInfo[assetId] === undefined,
  )
  .map(([assetId]) => assetId);

if (ORPHAN_EVM_ASSET_IDS.length === 0) {
  throw new Error(
    'State log no longer has non-zero EVM balances without assetsInfo',
  );
}

/** Tron resource / native balances that never get an `assetsInfo` entry by design. */
export const NON_EVM_ASSET_IDS_WITHOUT_INFO = (
  Object.keys(tronAccountBalances) as CaipAssetType[]
).filter((assetId) => assetsInfo[assetId] === undefined);

const pricedOrphanAssetId = ORPHAN_EVM_ASSET_IDS.find(
  (assetId) => (assetsPrice[assetId]?.price ?? 0) > 0,
);

if (!pricedOrphanAssetId) {
  throw new Error(
    'State log no longer prices any EVM balance that is missing assetsInfo',
  );
}

/** The orphan whose price would inflate aggregated fiat if it were included. */
export const PRICED_ORPHAN_ASSET_ID = pricedOrphanAssetId;

/**
 * Copy of AssetsController state with metadata for the priced orphan, so
 * aggregation is allowed to include that balance.
 *
 * @param assetsControllerState - Slice to copy. Defaults to the state log.
 * @returns State with a stub `assetsInfo` entry for {@link PRICED_ORPHAN_ASSET_ID}.
 */
export const withPricedOrphanAssetsInfo = (
  assetsControllerState: AssetsControllerState = assetsControllerStateLog,
): AssetsControllerState =>
  ({
    ...assetsControllerState,
    assetsInfo: {
      ...assetsControllerState.assetsInfo,
      [PRICED_ORPHAN_ASSET_ID]: {
        type: 'erc20',
        name: 'Orphan Token',
        symbol: 'ORPHAN',
        decimals: 18,
      },
    },
  }) as AssetsControllerState;
