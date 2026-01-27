import { SdkEnvironment } from '@consensys/native-ramps-sdk';

// Environment is set at build time via builds.yml
export function getSdkEnvironment() {
  const rampsEnv = process.env.RAMPS_ENVIRONMENT;
  return rampsEnv === 'production'
    ? SdkEnvironment.Production
    : SdkEnvironment.Staging;
}
