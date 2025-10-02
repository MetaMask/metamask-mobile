import { SdkEnvironment } from '@consensys/native-ramps-sdk';

export function getSdkEnvironment() {
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  switch (metamaskEnvironment) {
    case 'production':
    case 'rc':
    case 'beta':
    case 'exp':
      return SdkEnvironment.Production;

    case 'dev':
    case 'test':
    case 'e2e':
    default:
      return SdkEnvironment.Staging;
  }
}
