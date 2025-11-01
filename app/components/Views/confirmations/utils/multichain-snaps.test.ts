import { InternalAccount } from '@metamask/keyring-internal-api';

// eslint-disable-next-line import/no-namespace
import * as SnapUtils from '../../../../core/Snaps/utils';
import {
  sendMultichainTransactionForReview,
  validateAmountMultichain,
} from './multichain-snaps';

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
