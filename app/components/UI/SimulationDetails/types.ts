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
}>;

/** Token standards supported by simulation. */
export enum SimulationTokenStandard {
  erc20 = 'erc20',
  erc721 = 'erc721',
  erc1155 = 'erc1155',
}

/** Simulation data concerning an updated token. */
export interface SimulationToken {
  /** The token's contract address. */
  address: Hex;

  /** The standard of the token. */
  standard: SimulationTokenStandard;

  /** The ID of the token if supported by the standard. */
  id?: Hex;
}

/** Simulation data concerning an update to a native or token balance. */
export interface SimulationBalanceChange {
  /** The balance before the transaction. */
  previousBalance: Hex;

  /** The balance after the transaction. */
  newBalance: Hex;

  /** The difference in balance. */
  difference: Hex;

  /** Whether the balance is increasing or decreasing. */
  isDecrease: boolean;
}

/** Simulation data concerning a change to the a token balance. */
export type SimulationTokenBalanceChange = SimulationToken &
  SimulationBalanceChange;

export enum SimulationErrorCode {
  ChainNotSupported = 'chain-not-supported',
  Disabled = 'disabled',
  InvalidResponse = 'invalid-response',
  Reverted = 'reverted',
}

/** Error data for a failed simulation. */
export interface SimulationError {
  /** Error code to identify the error type. */
  code?: string | number;

  /** Error message to describe the error. */
  message?: string;
}

/** Simulation data for a transaction. */
export interface SimulationData {
  /** Error data if the simulation failed or the transaction reverted. */
  error?: SimulationError;

  /** Data concerning a change to the user's native balance. */
  nativeBalanceChange?: SimulationBalanceChange;

  /** Data concerning a change to the user's token balances. */
  tokenBalanceChanges: SimulationTokenBalanceChange[];
}
