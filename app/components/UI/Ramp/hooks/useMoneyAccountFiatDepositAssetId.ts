import { useSelector } from 'react-redux';
import { hexToBigInt, toCaipAssetType } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { selectMetaMaskPayFiatFlags } from '../../../../selectors/featureFlagController/confirmations';
import { MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID } from '../utils/getMoneyAccountFiatDepositAssetId';

/**
 * Zero address — the conventional native-token sentinel used by core's
 * `transaction-pay-controller`. For non-Polygon chains this is the only
 * native-token address; Polygon uses `0x...1010` but the flag is never
 * expected to set that address directly (it uses the zero address or the
 * ERC-20 address for mUSD).
 */
const NATIVE_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000000000000';

/**
 * Build a CAIP-19 asset id from `{ address, chainId }` matching core's
 * `buildCaipAssetType` rules:
 *
 * - Native token (zero address) → `eip155:<decimalChain>/slip44:60`
 * - ERC-20                      → `eip155:<decimalChain>/erc20:<address>`
 *
 * Chain reference is the decimal representation of the hex chainId.
 */
function buildCaipAssetIdFromEntry(entry: {
  address: string;
  chainId: string;
}): string {
  const chainReference = String(hexToBigInt(entry.chainId as `0x${string}`));
  const isNative =
    entry.address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();

  if (isNative) {
    return toCaipAssetType('eip155', chainReference, 'slip44', '60');
  }

  return toCaipAssetType('eip155', chainReference, 'erc20', entry.address);
}

/**
 * Returns the CAIP-19 asset id used to gate (and later limit-check) the
 * money-account fiat deposit flow.
 *
 * Resolution order (mirrors core's `getFiatAssetPerTransactionType`):
 *
 * 1. `confirmations_pay_fiat.assetPerTransactionType.moneyAccountDeposit` —
 *    e.g. mUSD address when the LaunchDarkly flag is set.
 * 2. `MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID` — native ETH on mainnet
 *    (`eip155:1/slip44:60`), matching core's `ETH_MAINNET_FIAT_ASSET` fallback.
 */
export function useMoneyAccountFiatDepositAssetId(): string {
  const fiatFlags = useSelector(selectMetaMaskPayFiatFlags);

  const flagEntry =
    fiatFlags.assetPerTransactionType?.[TransactionType.moneyAccountDeposit];

  if (flagEntry) {
    return buildCaipAssetIdFromEntry(flagEntry);
  }

  return MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID;
}

export default useMoneyAccountFiatDepositAssetId;
