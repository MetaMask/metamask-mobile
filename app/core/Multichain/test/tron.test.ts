import { HandlerType } from '@metamask/snaps-utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipAssetType } from '@metamask/snaps-sdk';

import Engine from '../../Engine';
import { handleSnapRequest } from '../../Snaps/utils';
import {
  validateTronTransferAmount,
  getMaxSendableTronAmount,
} from '../tron';

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

  it('calls the Snap without toAddress for balance-only validation', async () => {
    mockHandleSnapRequest.mockResolvedValueOnce({ valid: true, errors: [] });

    const paramsWithoutTo = {
      accountId: 'tron-account-id',
      assetId:
        'tron:728126428/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' as CaipAssetType,
      value: '10',
    };

    await validateTronTransferAmount(mockAccount, paramsWithoutTo);

    expect(mockHandleSnapRequest).toHaveBeenCalledWith(
      Engine.controllerMessenger,
      {
        snapId: SNAP_ID,
        origin: 'metamask',
        handler: HandlerType.OnClientRequest,
        request: { method: 'onAmountInput', params: paramsWithoutTo },
      },
    );
  });
});

describe('getMaxSendableTronAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const maxParams = {
    accountId: 'tron-account-id',
    assetId:
      'tron:728126428/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' as CaipAssetType,
  };

  it('calls the Snap getMaxSendableAmount handler', async () => {
    const mockResult = {
      maxAmount: '100',
      balance: '150',
      fees: { bandwidth: '1', energy: '2' },
      valid: true,
      errors: [],
    };
    mockHandleSnapRequest.mockResolvedValueOnce(mockResult);

    const result = await getMaxSendableTronAmount(mockAccount, maxParams);

    expect(mockHandleSnapRequest).toHaveBeenCalledWith(
      Engine.controllerMessenger,
      {
        snapId: SNAP_ID,
        origin: 'metamask',
        handler: HandlerType.OnClientRequest,
        request: { method: 'getMaxSendableAmount', params: maxParams },
      },
    );
    expect(result).toEqual(mockResult);
  });

  it('returns the Snap result with toAddress when provided', async () => {
    const mockResult = {
      maxAmount: '100',
      balance: '150',
      fees: { bandwidth: '1', energy: '2' },
      valid: true,
      errors: [],
    };
    mockHandleSnapRequest.mockResolvedValueOnce(mockResult);

    const paramsWithTo = {
      ...maxParams,
      toAddress: 'TDestination1234567890abcdefghij',
    };

    const result = await getMaxSendableTronAmount(mockAccount, paramsWithTo);

    expect(result).toEqual(mockResult);
  });

  it('returns the Snap result when insufficient balance for fees', async () => {
    const mockResult = {
      maxAmount: '0',
      balance: '10',
      fees: { bandwidth: '1', energy: '2' },
      valid: false,
      errors: [{ code: 'InsufficientBalanceToCoverFee' }],
    };
    mockHandleSnapRequest.mockResolvedValueOnce(mockResult);

    const result = await getMaxSendableTronAmount(mockAccount, maxParams);

    expect(result).toEqual(mockResult);
  });

  it('returns undefined when the Snap returns nothing', async () => {
    mockHandleSnapRequest.mockResolvedValueOnce(undefined);

    const result = await getMaxSendableTronAmount(mockAccount, maxParams);

    expect(result).toBeUndefined();
  });

  it('propagates errors thrown by the Snap', async () => {
    mockHandleSnapRequest.mockRejectedValueOnce(new Error('Snap error'));

    await expect(
      getMaxSendableTronAmount(mockAccount, maxParams),
    ).rejects.toThrow('Snap error');
  });
});
