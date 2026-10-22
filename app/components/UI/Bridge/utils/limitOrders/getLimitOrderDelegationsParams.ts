import { formatAddressToAssetId } from '@metamask/bridge-controller';
import type { Caip19AssetId } from '@metamask/assets-controller';
import { calcTokenValue } from '../../../../../util/transactions';
import type { LimitOrderDelegationsParams } from '../../api/limitOrders/getDelegations';
import type { BridgeToken } from '../../types';

interface GetLimitOrderDelegationsParamsOptions {
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  /** Human-readable source amount, e.g. `'0.1'`. */
  sourceAmount?: string;
  /** Human-readable destination amount, e.g. `'220'`. */
  destTokenAmount?: string;
  expiresInMinutes: number;
}

/**
 * Converts a token amount to its minimal-unit string, e.g. `'0.1'` with 18
 * decimals becomes `'100000000000000000'`.
 *
 * @param amount - The human-readable amount.
 * @param decimals - The token's decimals.
 * @returns The minimal-unit amount, or `'0'` when the amount is missing.
 */
const toMinimalUnit = (amount: string | undefined, decimals: number): string =>
  amount ? calcTokenValue(amount, decimals).toFixed(0) : '0';

/**
 * Builds the unformatted order parameters the delegations request needs, from
 * the tokens and human-readable amounts shown on the limit order screen.
 *
 * `costTolerance` is deliberately left to the caller of the request, which
 * reads the live value from state.
 *
 * @param options - The selected tokens, amounts and expiration.
 * @returns The order parameters, with empty asset ids when a token is missing.
 */
export function getLimitOrderDelegationsParams({
  sourceToken,
  destToken,
  sourceAmount,
  destTokenAmount,
  expiresInMinutes,
}: GetLimitOrderDelegationsParamsOptions): Omit<
  LimitOrderDelegationsParams,
  'costTolerance'
> {
  return {
    sourceAssetId: (sourceToken
      ? formatAddressToAssetId(sourceToken.address, sourceToken.chainId)
      : undefined) as Caip19AssetId,
    sourceAmount: toMinimalUnit(sourceAmount, sourceToken?.decimals ?? 0),
    destAssetId: (destToken
      ? formatAddressToAssetId(destToken.address, destToken.chainId)
      : undefined) as Caip19AssetId,
    destAmount: toMinimalUnit(destTokenAmount, destToken?.decimals ?? 0),
    expiresInMinutes,
  };
}
