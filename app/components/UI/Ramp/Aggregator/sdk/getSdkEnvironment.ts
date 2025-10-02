import { Environment } from '@consensys/on-ramp-sdk';

export function getSdkEnvironment() {
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  switch (metamaskEnvironment) {
    case 'production':
    case 'rc':
    case 'beta':
    case 'exp':
      return Environment.Production;

    case 'dev':
    case 'test':
    case 'e2e':
    default:
      return Environment.Staging;
  }
}
