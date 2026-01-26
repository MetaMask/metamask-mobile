import { Environment } from '@consensys/on-ramp-sdk';

// Environment is set at build time via builds.yml
export function getSdkEnvironment() {
  const rampsEnv = process.env.RAMPS_ENVIRONMENT;
  return rampsEnv === 'production'
    ? Environment.Production
    : Environment.Staging;
}
