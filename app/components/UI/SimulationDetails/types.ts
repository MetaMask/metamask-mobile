import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';

export enum AssetType {
  Native = 'NATIVE',
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

export const NATIVE_ASSET_IDENTIFIER: NativeAssetIdentifier = {
  type: AssetType.Native,
};

/**
 * Describes an amount of fiat.
 */
export const FIAT_UNAVAILABLE = null;
export type FiatAmountAvailable = number;
export type FiatAmount = FiatAmountAvailable | typeof FIAT_UNAVAILABLE;

/**
 * Identifies the native asset of a chain.
 */
export interface NativeAssetIdentifier {
  type: AssetType.Native;
  address?: undefined;
  tokenId?: undefined;
}

/**
 * Uniquely identifies a token asset on a chain.
 */
export interface TokenAssetIdentifier {
  type: Exclude<AssetType, AssetType.Native>;
  address: Hex;
  tokenId?: Hex;
}

export type AssetIdentifier = Readonly<
  NativeAssetIdentifier | TokenAssetIdentifier
>;

/**
 * Describes a change in an asset's balance to a user's wallet.
 */
export type BalanceChange = Readonly<{
  /**
   * The asset identifier for the balance change.
   */
  asset: AssetIdentifier;

  /**
   * The quantity of asset tokens, expressed as a decimal value.
   *
   * This property represents the amount of tokens, taking into account the
   * number of decimals supported by the asset. The value can be positive
   * (increase) or negative (decrease).
   *
   * Example: If an asset supports 18 decimals, an `amount` of 1.5 represents
   * 1.5 tokens, or more precisely, 1.5 * 10^18 of the smallest divisible unit.
   */
  amount: BigNumber;

  /**
   * The amount of fiat currency that corresponds to the asset amount.
   */
  fiatAmount: FiatAmount;
}>;
