import type { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import type { CaipAssetType, Hex } from '@metamask/utils';
import { getEvmPaymentTokenAssetId } from '../../../../util/transactions/payment-token';

/**
 * CAIP-19 asset ID of an EVM test token, as `selectEvmAssetIdResolver`
 * resolves it when the token is absent from `AssetsController` state.
 *
 * @param address - Token address, or the chain's native token address.
 * @param chainId - Hex chain ID.
 * @returns The CAIP-19 asset ID.
 */
export function evmAssetId(address: string, chainId: string): CaipAssetType {
  return getEvmPaymentTokenAssetId(
    { address: address as Hex, chainId: chainId as Hex },
    {},
  );
}

/**
 * Resolver matching `selectEvmAssetIdResolver` over empty `AssetsController`
 * state, for tests that mock `useSelector`.
 *
 * @param token - EVM token.
 * @param token.address - Token address.
 * @param token.chainId - Hex chain ID.
 * @returns The CAIP-19 asset ID.
 */
export const resolveEvmAssetIdMock = ({
  address,
  chainId,
}: {
  address: string;
  chainId: string;
}): CaipAssetType => evmAssetId(address, chainId);

/**
 * Build a payment token for an EVM test token.
 *
 * @param token - Token fields, identified by chain and address.
 * @param token.address - Token address.
 * @param token.chainId - Hex chain ID.
 * @returns The payment token, keyed by its CAIP-19 asset ID.
 */
export function buildPaymentTokenMock({
  address,
  chainId,
  ...token
}: Partial<Omit<TransactionPaymentToken, 'assetId'>> & {
  address: string;
  chainId: string;
}): TransactionPaymentToken {
  return {
    assetId: evmAssetId(address, chainId),
    balanceFiat: '0',
    balanceHuman: '0',
    balanceRaw: '0',
    balanceUsd: '0',
    decimals: 18,
    symbol: 'TST',
    ...token,
  };
}
