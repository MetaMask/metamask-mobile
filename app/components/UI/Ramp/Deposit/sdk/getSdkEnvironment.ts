import { SdkEnvironment } from '@consensys/native-ramps-sdk';

const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;

export function getSdkEnvironment() {
  switch (metamaskEnvironment) {
    case 'production':
    case 'beta':
    case 'rc':
      return SdkEnvironment.Production;

    case 'dev':
    case 'exp':
    case 'test':
    case 'e2e':
    default:
      return SdkEnvironment.Staging;
  }
}
