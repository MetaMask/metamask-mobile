import {
  getDevAutoUnlockPassword,
  getTransactionPayFiatTestOptions,
  isProduction,
} from './environment';

const originalMetamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
const originalMetamaskBuildType = process.env.METAMASK_BUILD_TYPE;

describe('isProduction', () => {
  afterAll(() => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: originalMetamaskEnvironment,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  it('returns true when METAMASK_ENVIRONMENT is "production"', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'production',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    expect(isProduction()).toBe(true);
  });

  it('returns false when METAMASK_ENVIRONMENT is "development"', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'development',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    expect(isProduction()).toBe(false);
  });

  it('returns false when METAMASK_ENVIRONMENT is "test"', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'test',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    expect(isProduction()).toBe(false);
  });
});

describe('getDevAutoUnlockPassword', () => {
  const originalDevAutoUnlockPassword = process.env.DEV_AUTO_UNLOCK_PASSWORD;

  afterEach(() => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: originalMetamaskEnvironment,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process.env, 'DEV_AUTO_UNLOCK_PASSWORD', {
      value: originalDevAutoUnlockPassword,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  it('returns the password in dev', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'dev',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process.env, 'DEV_AUTO_UNLOCK_PASSWORD', {
      value: 'test-password',
      writable: true,
      enumerable: true,
      configurable: true,
    });

    expect(getDevAutoUnlockPassword()).toBe('test-password');
  });

  it('returns undefined outside dev', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'production',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process.env, 'DEV_AUTO_UNLOCK_PASSWORD', {
      value: 'test-password',
      writable: true,
      enumerable: true,
      configurable: true,
    });

    expect(getDevAutoUnlockPassword()).toBeUndefined();
  });

  it('returns undefined when password is empty', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'dev',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process.env, 'DEV_AUTO_UNLOCK_PASSWORD', {
      value: '',
      writable: true,
      enumerable: true,
      configurable: true,
    });

    expect(getDevAutoUnlockPassword()).toBeUndefined();
  });
});

describe('getTransactionPayFiatTestOptions', () => {
  const originalFundingSource =
    process.env.TRANSACTION_PAY_FIAT_TEST_FUNDING_SOURCE;
  const originalAmountOverride =
    process.env.TRANSACTION_PAY_FIAT_TEST_AMOUNT_OVERRIDE;

  afterEach(() => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: originalMetamaskEnvironment,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process.env, 'METAMASK_BUILD_TYPE', {
      value: originalMetamaskBuildType,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(
      process.env,
      'TRANSACTION_PAY_FIAT_TEST_FUNDING_SOURCE',
      {
        value: originalFundingSource,
        writable: true,
        enumerable: true,
        configurable: true,
      },
    );
    Object.defineProperty(
      process.env,
      'TRANSACTION_PAY_FIAT_TEST_AMOUNT_OVERRIDE',
      {
        value: originalAmountOverride,
        writable: true,
        enumerable: true,
        configurable: true,
      },
    );
  });

  it('returns the funding source in dev', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'dev',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(
      process.env,
      'TRANSACTION_PAY_FIAT_TEST_FUNDING_SOURCE',
      {
        value: '0x1234567890123456789012345678901234567890',
        writable: true,
        enumerable: true,
        configurable: true,
      },
    );

    expect(getTransactionPayFiatTestOptions()).toStrictEqual({
      testAmountOverride: undefined,
      testFundingSource: '0x1234567890123456789012345678901234567890',
    });
  });

  it('returns the funding source in flask builds', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'production',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process.env, 'METAMASK_BUILD_TYPE', {
      value: 'flask',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(
      process.env,
      'TRANSACTION_PAY_FIAT_TEST_FUNDING_SOURCE',
      {
        value: '0x1234567890123456789012345678901234567890',
        writable: true,
        enumerable: true,
        configurable: true,
      },
    );

    expect(getTransactionPayFiatTestOptions()).toStrictEqual({
      testAmountOverride: undefined,
      testFundingSource: '0x1234567890123456789012345678901234567890',
    });
  });

  it('returns the amount override in enabled builds', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'dev',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(
      process.env,
      'TRANSACTION_PAY_FIAT_TEST_AMOUNT_OVERRIDE',
      {
        value: '0.1',
        writable: true,
        enumerable: true,
        configurable: true,
      },
    );

    expect(getTransactionPayFiatTestOptions()).toStrictEqual({
      testAmountOverride: '0.1',
      testFundingSource: undefined,
    });
  });

  it('returns undefined outside enabled builds', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'production',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process.env, 'METAMASK_BUILD_TYPE', {
      value: 'main',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(
      process.env,
      'TRANSACTION_PAY_FIAT_TEST_FUNDING_SOURCE',
      {
        value: '0x1234567890123456789012345678901234567890',
        writable: true,
        enumerable: true,
        configurable: true,
      },
    );

    expect(getTransactionPayFiatTestOptions()).toBeUndefined();
  });

  it('returns undefined when the funding source is empty', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'dev',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(
      process.env,
      'TRANSACTION_PAY_FIAT_TEST_FUNDING_SOURCE',
      {
        value: '',
        writable: true,
        enumerable: true,
        configurable: true,
      },
    );

    expect(getTransactionPayFiatTestOptions()).toBeUndefined();
  });
});
