import { getApiEnv } from '../../../../core/apiEnv';
import type { PredictHex } from '../types';
import {
  resolvePredictCluster,
  type ClusterReading,
} from './predictClusterUrls';

/**
 * The chain and token a build expects every Funding Plan to name. The app
 * never takes either from the backend or a remote flag: a plan that names
 * anything else is refused before any wallet call.
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

/** The dev Predict API talks to Kalshi demo, whose plans are on Base
 * Sepolia with Circle's test USDC. */
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

/** `METAMASK_ENVIRONMENT` values of builds that reach users. None of them may
 * simulate a transfer or expect a test network, whatever `MM_API_ENV` says. */
const RELEASE_ENVIRONMENTS: readonly string[] = ['production', 'beta', 'rc'];

export interface DepositEnvironmentReading extends ClusterReading {
  /** `METAMASK_ENVIRONMENT` as written. */
  metamaskEnvironment: string | undefined;
}

/**
 * The build's deposit environment. A build that points at the dev Predict
 * API (the same cluster rule as `getPredictApiUrl`: `MM_API_ENV=dev`, or a
 * local development build with no `MM_API_ENV`) expects Base Sepolia plans
 * and simulates the transfer, because Kalshi demo settles a reported hash
 * without a real transfer. Every other build, and every release build,
 * expects Base mainnet and sends a real transfer.
 *
 * `MM_PREDICT_API_URL` does not change the answer: an override points at a
 * server, not at a Kalshi environment, so only the cluster decides.
 */
export const resolvePredictDepositEnvironment = (
  reading: DepositEnvironmentReading,
): PredictDepositEnvironment => {
  const isReleaseBuild = RELEASE_ENVIRONMENTS.includes(
    (reading.metamaskEnvironment ?? '').trim().toLowerCase(),
  );
  const isDevPredictApi = resolvePredictCluster(reading) === 'dev';
  return !isReleaseBuild && isDevPredictApi
    ? { network: BASE_SEPOLIA_DEPOSIT_NETWORK, transferMode: 'simulated' }
    : { network: BASE_DEPOSIT_NETWORK, transferMode: 'wallet' };
};

/** Read from the build's environment at call time, like `getPredictApiUrl`. */
export const getPredictDepositEnvironment = (): PredictDepositEnvironment =>
  resolvePredictDepositEnvironment({
    rawApiEnv: process.env.MM_API_ENV,
    apiEnv: getApiEnv(),
    isDevelopment: __DEV__,
    metamaskEnvironment: process.env.METAMASK_ENVIRONMENT,
  });
