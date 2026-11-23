import type { PredictHex, PredictVenueEnvironment } from '../types';

/**
 * The chain and token a Venue catalog's environment expects every Funding Plan
 * to name. A plan that names anything else is refused before any wallet call.
 */
export interface PredictDepositNetwork {
  /** EIP-155 chain ID, decimal, as Funding Plans carry it. */
  chainId: number;
  /** The chain's name in copy, such as "Not enough USDC on Base". */
  networkName: string;
  /** USDC on that chain: the only token a Funding Plan may name. */
  usdc: {
    address: PredictHex;
    symbol: 'USDC';
    decimals: 6;
  };
}

/** Production: Base mainnet and Circle's native USDC on it. */
export const BASE_DEPOSIT_NETWORK: PredictDepositNetwork = {
  chainId: 8453,
  networkName: 'Base',
  usdc: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    decimals: 6,
  },
};

/** Sandbox: Base Sepolia with Circle's test USDC, where Kalshi demo settles a
 * reported hash without a real transfer. */
export const BASE_SEPOLIA_DEPOSIT_NETWORK: PredictDepositNetwork = {
  chainId: 84532,
  networkName: 'Base Sepolia',
  usdc: {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    symbol: 'USDC',
    decimals: 6,
  },
};

/**
 * How the deposit transfer is sent. `wallet` adds a real transaction and the
 * user confirms it. `simulated` only logs the transfer it would send and
 * answers a random hash; it never touches the wallet.
 */
export type PredictDepositTransferMode = 'wallet' | 'simulated';

export interface PredictDepositEnvironment {
  network: PredictDepositNetwork;
  transferMode: PredictDepositTransferMode;
}

/**
 * Resolves a Venue's deposit network and transfer mode directly from
 * `catalog.environment` in every build (`production`, `beta`, `rc`, `dev`,
 * `uat`). `'sandbox'` expects Base Sepolia plans and simulates the transfer;
 * `'production'` expects Base mainnet plans and sends a real wallet transfer.
 */
export const resolvePredictDepositEnvironment = (
  venueEnvironment: PredictVenueEnvironment,
): PredictDepositEnvironment =>
  venueEnvironment === 'sandbox'
    ? { network: BASE_SEPOLIA_DEPOSIT_NETWORK, transferMode: 'simulated' }
    : { network: BASE_DEPOSIT_NETWORK, transferMode: 'wallet' };
