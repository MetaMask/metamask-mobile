import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';

export enum AssetType {
  Native = 'NATIVE',
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

/**
 * Describes an amount of fiat.
 */
export const FIAT_UNAVAILABLE = null;
export type FiatAmountAvailable = number | string;
export type FiatAmount = FiatAmountAvailable | typeof FIAT_UNAVAILABLE;

/**
 * Identifies the native asset of a chain.
 */
export interface NativeAssetIdentifier {
  address?: undefined;
  chainId: Hex;
  tokenId?: undefined;
  type: AssetType.Native;
}

/**
 * Uniquely identifies a token asset on a chain.
 */
export interface TokenAssetIdentifier {
  address: Hex;
  chainId: Hex;
  tokenId?: Hex;
  type: Exclude<AssetType, AssetType.Native>;
}

export type AssetIdentifier = Readonly<
  NativeAssetIdentifier | TokenAssetIdentifier
>;

export enum TokenStandard {
  /** A token that conforms to the ERC20 standard. */
  ERC20 = 'ERC20',
  /** A token that conforms to the ERC721 standard. */
  ERC721 = 'ERC721',
  /** A token that conforms to the ERC1155 standard. */
  ERC1155 = 'ERC1155',
  /** Not a token, but rather the base asset of the selected chain. */
  none = 'NONE',
}

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

  /**
   * Optional field, it is total balance in the account of the ERC20 token
   */
  balance?: BigNumber;

  /**
   * Optional field, number of decimals in the ERC20 token
   */
  decimals?: number;

  /**
   * Optional field, symbol of the ERC20 token
   */
  tokenSymbol?: string;

  /**
   * Optional field is balance change in All Approval
   */
  isAllApproval?: boolean;

  /**
   * Optional field is balance change in Unlimited Approval
   */
  isUnlimitedApproval?: boolean;

  /** The amount of USD that corresponds to the asset amount. */
  usdAmount: FiatAmount;
}>;
