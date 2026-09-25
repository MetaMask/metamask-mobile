import { devApiEnv } from '../../../../core/devApiEnv';
import { SdkEnvironment } from '../types/legacyDeposit';

/**
 * Legacy deposit SDK has Production and Staging only.
 * Dev and UAT clusters both use Staging. Prod uses Production.
 */
export function getSdkEnvironment() {
  return devApiEnv() === 'prod'
    ? SdkEnvironment.Production
    : SdkEnvironment.Staging;
}
