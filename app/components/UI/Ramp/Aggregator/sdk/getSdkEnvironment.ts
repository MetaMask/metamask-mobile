import { Environment } from '@consensys/on-ramp-sdk';

export function getSdkEnvironment() {
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  switch (metamaskEnvironment) {
    case 'production':
    case 'beta':
    case 'rc':
      return Environment.Production;

    case 'dev':
    case 'exp':
    case 'test':
    case 'e2e':
    default:
      return Environment.Staging;
  }
}
