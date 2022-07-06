import { Country, State } from '@consensys/on-ramp-sdk';

export type Region = Country & State;

export enum PROVIDER_LINKS {
  HOMEPAGE = 'Homepage',
  PRIVACY_POLICY = 'Privacy Policy',
  SUPPORT = 'Support',
}

export * from './analytics';
