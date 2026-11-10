import { Env } from '@metamask/geolocation-controller';
import type { WalletOptions } from '@metamask/wallet';
import { SdkEnvironment } from '../../../../components/UI/Ramp/types/legacyDeposit';
import { getSdkEnvironment } from '../../../../components/UI/Ramp/utils/getSdkEnvironment';

type GeolocationApiServiceInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['geolocationApiService']
>;

/**
 * Mobile follows the Ramp SDK environment so the geolocation API points at
 * the same backend cluster as Ramp.
 *
 * @returns The mobile GeolocationApiService instance options.
 */
export function getGeolocationApiServiceInstanceOptions(): GeolocationApiServiceInstanceOptions {
  const env =
    getSdkEnvironment() === SdkEnvironment.Production ? Env.PRD : Env.DEV;

  return {
    env,
    fetch: fetch.bind(globalThis),
  };
}
