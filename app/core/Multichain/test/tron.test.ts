import { HandlerType } from '@metamask/snaps-utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipAssetType } from '@metamask/snaps-sdk';

import Engine from '../../Engine';
import { handleSnapRequest } from '../../Snaps/utils';
import { validateTronTransferAmount } from '../tron';

jest.mock('../../Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../Snaps/utils', () => ({
  handleSnapRequest: jest.fn(),
}));

const mockHandleSnapRequest = handleSnapRequest as jest.Mock;

const SNAP_ID = 'npm:@metamask/tron-wallet-snap';

const mockAccount = {
  id: 'tron-account-id',
  address: 'TXYZ1234567890abcdefghijklmnopqrst',
  metadata: { snap: { id: SNAP_ID } },
} as unknown as InternalAccount;

const params = {
  accountId: 'tron-account-id',
  assetId:
    'tron:728126428/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' as CaipAssetType,
  value: '10',
  toAddress: 'TDepositWallet1234567890abcdefghij',
};

describe('validateTronTransferAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the Snap onAmountInput handler with the destination address', async () => {
    mockHandleSnapRequest.mockResolvedValueOnce({ valid: true, errors: [] });

    await validateTronTransferAmount(mockAccount, params);

    expect(mockHandleSnapRequest).toHaveBeenCalledWith(
      Engine.controllerMessenger,
      {
        snapId: SNAP_ID,
        origin: 'metamask',
        handler: HandlerType.OnClientRequest,
        request: { method: 'onAmountInput', params },
      },
    );
  });

  it('returns the Snap result when the transfer is valid', async () => {
    mockHandleSnapRequest.mockResolvedValueOnce({ valid: true, errors: [] });

    const result = await validateTronTransferAmount(mockAccount, params);

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('returns the Snap errors when the transfer is invalid', async () => {
    mockHandleSnapRequest.mockResolvedValueOnce({
      valid: false,
      errors: [{ code: 'InsufficientBalanceToCoverFee' }],
    });

    const result = await validateTronTransferAmount(mockAccount, params);

    expect(result).toEqual({
      valid: false,
      errors: [{ code: 'InsufficientBalanceToCoverFee' }],
    });
  });

  it('returns undefined when the Snap returns nothing', async () => {
    mockHandleSnapRequest.mockResolvedValueOnce(undefined);

    const result = await validateTronTransferAmount(mockAccount, params);

    expect(result).toBeUndefined();
  });

  it('propagates errors thrown by the Snap so the caller can fail closed', async () => {
    mockHandleSnapRequest.mockRejectedValueOnce(new Error('Snap crashed'));

    await expect(
      validateTronTransferAmount(mockAccount, params),
    ).rejects.toThrow('Snap crashed');
  });
});
