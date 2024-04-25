import { Hex } from '@metamask/utils';

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
