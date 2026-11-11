import { ConfigRegistryApiEnv } from '@metamask/config-registry-controller';
import type { WalletOptions } from '@metamask/wallet';

type ConfigRegistryApiServiceInstanceOptions =
  WalletOptions['instanceOptions']['configRegistryApiService'];

/**
 * Mobile supplies env (production, matching AuthenticationController) and
 * fetch for the wallet-owned ConfigRegistryApiService.
 *
 * @returns The mobile ConfigRegistryApiService instance options.
 */
export function getConfigRegistryApiServiceInstanceOptions(): ConfigRegistryApiServiceInstanceOptions {
  return {
    env: ConfigRegistryApiEnv.PRD,
    fetch,
  };
}
