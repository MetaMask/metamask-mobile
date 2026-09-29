import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';

import type { RootState } from '../../reducers';
import { selectShouldUseSmartTransaction } from '../../selectors/smartTransactionsController';
import { accountSupports7702 } from './account-supports-7702';
import { isGasFeeSponsored } from './gas-sponsorship';
import { isSendBundleSupported } from './sentinel-api';
import { isRelaySupported } from './transaction-relay';

jest.mock('../../selectors/smartTransactionsController');
jest.mock('./account-supports-7702');
jest.mock('./sentinel-api');
jest.mock('./transaction-relay');

const TRANSACTION_MOCK: TransactionMeta = {
  chainId: '0x1',
  forceIsGasFeeSponsored: true,
  id: 'tx-1',
  networkClientId: 'mainnet',
  status: TransactionStatus.unapproved,
  time: 0,
  txParams: { from: '0x123', to: '0x456' },
  type: TransactionType.simpleSend,
};

function runIsGasFeeSponsored(overrides: Partial<TransactionMeta> = {}) {
  return isGasFeeSponsored({
    getKeyringForAccount: jest.fn(),
    getState: () => ({}) as RootState,
    transaction: { ...TRANSACTION_MOCK, ...overrides },
  });
}

describe('isGasFeeSponsored', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(selectShouldUseSmartTransaction).mockReturnValue(false);
    jest.mocked(isSendBundleSupported).mockResolvedValue(false);
    jest.mocked(accountSupports7702).mockResolvedValue(true);
    jest.mocked(isRelaySupported).mockResolvedValue(true);
  });

  it('returns false when sponsorship is neither forced nor available', async () => {
    expect(await runIsGasFeeSponsored({ forceIsGasFeeSponsored: false })).toBe(
      false,
    );
  });

  it('ignores the published sponsorship record', async () => {
    expect(
      await runIsGasFeeSponsored({
        forceIsGasFeeSponsored: false,
        isGasFeeSponsored: true,
      }),
    ).toBe(false);
  });

  it('returns false for revoke delegation transactions', async () => {
    expect(
      await runIsGasFeeSponsored({ type: TransactionType.revokeDelegation }),
    ).toBe(false);
  });

  it('returns true for Smart Transactions sendBundle without checking the keyring', async () => {
    jest.mocked(selectShouldUseSmartTransaction).mockReturnValue(true);
    jest.mocked(isSendBundleSupported).mockResolvedValue(true);
    jest.mocked(accountSupports7702).mockResolvedValue(false);

    expect(
      await runIsGasFeeSponsored({
        forceIsGasFeeSponsored: false,
        isGasFeeSponsoredAvailable: true,
      }),
    ).toBe(true);
    expect(accountSupports7702).not.toHaveBeenCalled();
  });

  it('returns true through the EIP-7702 relay', async () => {
    expect(await runIsGasFeeSponsored()).toBe(true);
    expect(accountSupports7702).toHaveBeenCalledWith(
      '0x123',
      expect.anything(),
      false,
    );
  });

  it('returns false when the keyring cannot sign EIP-7702 authorizations', async () => {
    jest.mocked(accountSupports7702).mockResolvedValue(false);

    expect(await runIsGasFeeSponsored()).toBe(false);
  });

  it('returns false when the relay does not support the chain', async () => {
    jest.mocked(isRelaySupported).mockResolvedValue(false);

    expect(await runIsGasFeeSponsored()).toBe(false);
  });

  it('returns false for contract deployments', async () => {
    expect(
      await runIsGasFeeSponsored({
        txParams: { from: '0x123', to: undefined },
      }),
    ).toBe(false);
  });
});
