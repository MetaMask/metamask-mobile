import BN from 'bnjs4';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipAssetType } from '@metamask/utils';

import { getTronMaxSendableAmountWithFallback } from './getTronMaxSendableAmountWithFallback';
import { getMaxSendableAmountMultichain } from '../../../utils/multichain-snaps';

const TRON_ACCOUNT = {
  id: 'tron-account-id',
  address: 'TK3xRFq22eEiATz6kfamDeAAQrPdfdGPeq',
  metadata: { snap: { id: 'npm:@metamask/tron-wallet-snap' } },
} as unknown as InternalAccount;

const NATIVE_BALANCE = {
  rawBalanceBN: new BN('10000000'),
  decimals: 6,
  isNative: true,
};

const TRC20_BALANCE = {
  rawBalanceBN: new BN('10000000'),
  decimals: 6,
  isNative: false,
};

const ASSET_ID = 'tron:728126428/slip44:195' as CaipAssetType;

jest.mock('../../../utils/multichain-snaps', () => ({
  getMaxSendableAmountMultichain: jest.fn(),
}));

describe('getTronMaxSendableAmountWithFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the amount quoted by the Snap', async () => {
    const getMaxSendableMock = (
      getMaxSendableAmountMultichain as jest.Mock
    ).mockResolvedValue({ amount: '9.5' });

    const result = await getTronMaxSendableAmountWithFallback({
      fromAccount: TRON_ACCOUNT,
      assetId: ASSET_ID,
      balance: NATIVE_BALANCE,
    });

    expect(result).toEqual({ amount: '9.5' });
    expect(getMaxSendableMock).toHaveBeenCalledWith(TRON_ACCOUNT, {
      accountId: TRON_ACCOUNT.id,
      assetId: ASSET_ID,
    });
  });

  it('passes the recipient when it is a Tron address', async () => {
    const getMaxSendableMock = (
      getMaxSendableAmountMultichain as jest.Mock
    ).mockResolvedValue({ amount: '9.5' });

    await getTronMaxSendableAmountWithFallback({
      fromAccount: TRON_ACCOUNT,
      assetId: ASSET_ID,
      toAddress: 'TK3xRFq22eEiATz6kfamDeAAQrPdfdGPeq',
      balance: NATIVE_BALANCE,
    });

    expect(getMaxSendableMock).toHaveBeenCalledWith(TRON_ACCOUNT, {
      accountId: TRON_ACCOUNT.id,
      assetId: ASSET_ID,
      toAddress: 'TK3xRFq22eEiATz6kfamDeAAQrPdfdGPeq',
    });
  });

  it('omits the recipient when it is not a Tron address', async () => {
    const getMaxSendableMock = (
      getMaxSendableAmountMultichain as jest.Mock
    ).mockResolvedValue({ amount: '9.5' });

    await getTronMaxSendableAmountWithFallback({
      fromAccount: TRON_ACCOUNT,
      assetId: ASSET_ID,
      toAddress: '0x123',
      balance: NATIVE_BALANCE,
    });

    expect(getMaxSendableMock).toHaveBeenCalledWith(TRON_ACCOUNT, {
      accountId: TRON_ACCOUNT.id,
      assetId: ASSET_ID,
    });
  });

  it('reserves 1.1 TRX when the Snap cannot quote a native maximum', async () => {
    (getMaxSendableAmountMultichain as jest.Mock).mockRejectedValue(
      new Error('Snap unavailable'),
    );

    const result = await getTronMaxSendableAmountWithFallback({
      fromAccount: TRON_ACCOUNT,
      assetId: ASSET_ID,
      balance: NATIVE_BALANCE,
    });

    expect(result).toEqual({ amount: '8.9' });
  });

  it('returns zero when the native balance cannot cover the reserve', async () => {
    (getMaxSendableAmountMultichain as jest.Mock).mockRejectedValue(
      new Error('Snap unavailable'),
    );

    const result = await getTronMaxSendableAmountWithFallback({
      fromAccount: TRON_ACCOUNT,
      assetId: ASSET_ID,
      balance: { ...NATIVE_BALANCE, rawBalanceBN: new BN('1000000') },
    });

    expect(result).toEqual({ amount: '0' });
  });

  it('leaves the TRC-20 balance whole when the Snap cannot quote', async () => {
    (getMaxSendableAmountMultichain as jest.Mock).mockRejectedValue(
      new Error('Snap unavailable'),
    );

    const result = await getTronMaxSendableAmountWithFallback({
      fromAccount: TRON_ACCOUNT,
      assetId: ASSET_ID,
      balance: TRC20_BALANCE,
    });

    expect(result).toEqual({ amount: '10' });
  });

  it('falls back when the Snap returns no amount', async () => {
    (getMaxSendableAmountMultichain as jest.Mock).mockResolvedValue(undefined);

    const result = await getTronMaxSendableAmountWithFallback({
      fromAccount: TRON_ACCOUNT,
      assetId: ASSET_ID,
      balance: NATIVE_BALANCE,
    });

    expect(result).toEqual({ amount: '8.9' });
  });
});
