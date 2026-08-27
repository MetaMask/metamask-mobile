import { TransactionStatus as KeyringTransactionStatus } from '@metamask/keyring-api';
import { resolveAssetActivationActivityTitle } from './trustline';

jest.mock('../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('trustline activity helpers', () => {
  it('resolves confirmed activate title with token symbol', () => {
    expect(
      resolveAssetActivationActivityTitle(
        KeyringTransactionStatus.Confirmed,
        'USDC',
        true,
      ),
    ).toBe('transactions.activity_trustline_activated USDC');
  });

  it('resolves confirmed deactivate title without token symbol', () => {
    expect(
      resolveAssetActivationActivityTitle(
        KeyringTransactionStatus.Confirmed,
        undefined,
        false,
      ),
    ).toBe('transactions.activity_trustline_deactivated');
  });

  it('resolves pending activate title with token symbol', () => {
    expect(
      resolveAssetActivationActivityTitle(
        KeyringTransactionStatus.Submitted,
        'USDC',
        true,
      ),
    ).toBe('transactions.activity_trustline_activating USDC');
  });

  it('resolves failed deactivate title without token symbol', () => {
    expect(
      resolveAssetActivationActivityTitle(
        KeyringTransactionStatus.Failed,
        undefined,
        false,
      ),
    ).toBe('transactions.activity_trustline_deactivation_failed');
  });

  it('resolves failed activate title without token symbol', () => {
    expect(
      resolveAssetActivationActivityTitle(
        KeyringTransactionStatus.Failed,
        'USDC',
        true,
      ),
    ).toBe('transactions.activity_trustline_activation_failed');
  });
});
