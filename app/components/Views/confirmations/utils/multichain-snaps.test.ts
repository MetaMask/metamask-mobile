import { InternalAccount } from '@metamask/keyring-internal-api';

// eslint-disable-next-line import-x/no-namespace
import * as SnapUtils from '../../../../core/Snaps/utils';
import {
  getMaxSendableAmountMultichain,
  sendMultichainTransactionForReview,
  validateAmountMultichain,
} from './multichain-snaps';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('sendMultichainTransactionForReview', () => {
  it('call handleSnapRequest with correct parameters', () => {
    const mockHandleSnapRequest = jest
      .spyOn(SnapUtils, 'handleSnapRequest')
      .mockImplementation(() => Promise.resolve());

    sendMultichainTransactionForReview(
      { metadata: { snap: { id: '123' } } } as unknown as InternalAccount,
      {
        amount: '0.97544',
        assetId:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        fromAccountId: '58f25c62-ba95-4eee-99e1-a974ebdbdb70',
        toAddress: '4Nd1mYdGQJkQ1tDk1H6rQhzX8ZcA5m9D7nFDJw3YcCVf',
      },
    );
    expect(mockHandleSnapRequest).toHaveBeenCalled();
  });
});

describe('validateAmountMultichain', () => {
  it('call handleSnapRequest with correct parameters', () => {
    const mockHandleSnapRequest = jest
      .spyOn(SnapUtils, 'handleSnapRequest')
      .mockImplementation(() => Promise.resolve());

    validateAmountMultichain(
      { metadata: { snap: { id: '123' } } } as unknown as InternalAccount,
      {
        value: '0.97544',
        assetId:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        accountId: '58f25c62-ba95-4eee-99e1-a974ebdbdb70',
      },
    );
    expect(mockHandleSnapRequest).toHaveBeenCalled();
  });
});

describe('getMaxSendableAmountMultichain', () => {
  it('requests getMaxSendableAmount from the account Snap with the params', async () => {
    const mockHandleSnapRequest = jest
      .spyOn(SnapUtils, 'handleSnapRequest')
      .mockResolvedValue({ amount: '9.5' });
    const params = {
      accountId: 'account-id',
      assetId: 'tron:728126428/slip44:195' as const,
      toAddress: 'TDepositWallet1234567890abcdefghij',
    };

    const result = await getMaxSendableAmountMultichain(
      { metadata: { snap: { id: '123' } } } as unknown as InternalAccount,
      params,
    );

    expect(result).toEqual({ amount: '9.5' });
    expect(mockHandleSnapRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        snapId: '123',
        request: { method: 'getMaxSendableAmount', params },
      }),
    );
  });
});
