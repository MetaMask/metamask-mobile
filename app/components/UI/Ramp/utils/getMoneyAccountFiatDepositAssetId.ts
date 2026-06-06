import { toCaipAssetType } from '@metamask/utils';

/**
 * CAIP-19 asset id used to gate (and later limit-check) the money-account fiat
 * deposit flow.
 *
 * Money-account fiat deposit on-ramps in native ETH on mainnet, which is then
 * bridged to mUSD. This mirrors core's `ETH_MAINNET_FIAT_ASSET` — the
 * `getFiatAssetPerTransactionType` fallback for `moneyAccountDeposit`, which is
 * NOT present in `FIAT_ASSET_ID_BY_TX_TYPE`. Native tokens render as
 * `slip44:60` (see core `buildCaipAssetType`).
 *
 * NOTE: mobile `MetaMaskPayFiatFlags` does not expose
 * `assetPerTransactionType`, so the `confirmations_pay_fiat` asset override is
 * not read here. Follow-up if that flag is ever set.
 */
export const MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID = toCaipAssetType(
  'eip155',
  '1',
  'slip44',
  '60',
);
