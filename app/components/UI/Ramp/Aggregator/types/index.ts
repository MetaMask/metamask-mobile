export type { Region } from '../../../../../reducers/fiatOrders/types';
export { RampType } from '../../../../../reducers/fiatOrders/types';

export * from './analytics';
export type { RampIntent } from '../../types';

export enum PROVIDER_LINKS {
  HOMEPAGE = 'Homepage',
  PRIVACY_POLICY = 'Privacy Policy',
  SUPPORT = 'Support',
  TOS = 'Terms of Service',
}

export interface QuickAmount {
  value: number;
  label: string;
  isNative?: boolean;
}
