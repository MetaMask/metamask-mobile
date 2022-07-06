import { Country, State } from '@consensys/on-ramp-sdk';

export type Region = Country & State;

export enum PROVIDER_LINKS {
  HOMEPAGE = 'Homepage',
  PRIVACY_POLICY = 'Privacy Policy',
  SUPPORT = 'Support',
}

//TODO: to be removed and imported directly from the SDK
export enum PaymentType {
  debitOrCredit = 'debit-credit-card',
  bankAccount = 'bank-transfer',
  applePay = 'apple-pay',
  googlePay = 'google-pay',
}

export * from './analytics';
