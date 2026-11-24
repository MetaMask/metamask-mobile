import type { Hex } from '@metamask/utils';

import Engine from '../../../../core/Engine';
import { createLighterCallbacks } from './lighter-callbacks';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      submitLighterTransfer: jest.fn(),
    },
  },
}));

const REQUEST_MOCK = {
  accountIndex: 770167,
  eoa: '0x1234567890123456789012345678901234567890' as Hex,
  toAccountIndex: 723071,
  assetIndex: 3,
  fromRouteType: 0,
  toRouteType: 0,
  amount: 1000000,
  usdcFee: 3000000,
  memo: `0x${'ab'.repeat(32)}` as const,
};

describe('createLighterCallbacks', () => {
  const submitLighterTransferMock = (
    Engine.context.PerpsController as unknown as {
      submitLighterTransfer: jest.Mock;
    }
  ).submitLighterTransfer;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('sends the transfer, including its account, through the perps controller', async () => {
    submitLighterTransferMock.mockResolvedValue({ success: true });
    const result = await createLighterCallbacks().submitTransfer(REQUEST_MOCK);

    expect(result).toStrictEqual({ success: true });
    expect(submitLighterTransferMock).toHaveBeenCalledWith(REQUEST_MOCK);
  });

  it('throws the error reported by the Lighter provider', async () => {
    submitLighterTransferMock.mockResolvedValue({
      success: false,
      error: 'nonce too low',
    });

    await expect(
      createLighterCallbacks().submitTransfer(REQUEST_MOCK),
    ).rejects.toThrow('nonce too low');
  });

  it('throws a default error when the failure has no message', async () => {
    submitLighterTransferMock.mockResolvedValue({ success: false });

    await expect(
      createLighterCallbacks().submitTransfer(REQUEST_MOCK),
    ).rejects.toThrow('Lighter transfer failed');
  });
});
