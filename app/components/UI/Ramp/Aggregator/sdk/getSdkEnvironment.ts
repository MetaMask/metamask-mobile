import { Environment } from '@consensys/on-ramp-sdk';
import { ApiEnv, getApiEnv } from '../../../../../core/apiEnv';

/**
 * On-ramp SDK has Production and Staging only.
 * Dev and UAT clusters both use Staging. Prod uses Production.
 */
export function getSdkEnvironment() {
  return getApiEnv() === ApiEnv.Prod
    ? Environment.Production
    : Environment.Staging;
}
