/* eslint-disable import-x/prefer-default-export */
import type { TransactionPayFiatOptions } from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';

const DEV_ENVIRONMENT = 'dev';
const RC_ENVIRONMENT = 'rc';
const FLASK_BUILD_TYPE = 'flask';

// TODO: This should be consolidated into app/util/test/utils.js
// This needs to be updated to check for the METAMASK_ENVIRONMENT environment variable instead of NODE_ENV
// Once this is updated, verify that e2e smoke tests are working as expected
export const isProduction = (): boolean =>
  process.env.METAMASK_ENVIRONMENT === 'production';

export const isE2EMockOAuth = (): boolean =>
  process.env.E2E_MOCK_OAUTH === 'true';

export const getE2EByoaAuthSecret = (): string | undefined => {
  const secret = process.env.E2E_BYOA_AUTH_SECRET;
  return typeof secret === 'string' && secret.length > 0 ? secret : undefined;
};

export const getE2EMockOAuthEmailForQaMock = (): string | undefined => {
  const email = process.env.E2E_MOCK_OAUTH_EMAIL;
  return typeof email === 'string' && email.length > 0 ? email : undefined;
};

export const getDevAutoUnlockPassword = (): string | undefined => {
  const password = process.env.DEV_AUTO_UNLOCK_PASSWORD;

  if (process.env.METAMASK_ENVIRONMENT !== DEV_ENVIRONMENT) {
    return undefined;
  }

  return typeof password === 'string' && password.length > 0
    ? password
    : undefined;
};

export const getTransactionPayFiatTestOptions = ():
  | TransactionPayFiatOptions
  | undefined => {
  const fundingSource = process.env.TRANSACTION_PAY_FIAT_TEST_FUNDING_SOURCE;
  const amountOverride = process.env.TRANSACTION_PAY_FIAT_TEST_AMOUNT_OVERRIDE;

  const isEnabledBuild =
    process.env.METAMASK_ENVIRONMENT === DEV_ENVIRONMENT ||
    process.env.METAMASK_ENVIRONMENT === RC_ENVIRONMENT ||
    process.env.METAMASK_BUILD_TYPE === FLASK_BUILD_TYPE;

  if (!isEnabledBuild) {
    return undefined;
  }

  const testFundingSource =
    typeof fundingSource === 'string' && fundingSource.length > 0
      ? (fundingSource as Hex)
      : undefined;

  const testAmountOverride =
    typeof amountOverride === 'string' && amountOverride.length > 0
      ? amountOverride
      : undefined;

  return testFundingSource || testAmountOverride
    ? { testAmountOverride, testFundingSource }
    : undefined;
};
