import { Environment } from '@consensys/on-ramp-sdk';
import { devApiEnv } from '../../../../../core/devApiEnv';

/**
 * On-ramp SDK has Production and Staging only.
 * Dev and UAT clusters both use Staging. Prod uses Production.
 */
export function getSdkEnvironment() {
  return devApiEnv() === 'prod' ? Environment.Production : Environment.Staging;
}
