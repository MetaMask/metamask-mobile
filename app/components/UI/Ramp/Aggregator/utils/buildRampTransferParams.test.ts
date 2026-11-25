import { NATIVE_ADDRESS } from '../../../../../constants/on-ramp';
import { generateTransferData } from '../../../../../util/transactions';
import { bigIntToHex } from '../../../../../util/number/bigint';
import { safeToChecksumAddress } from '../../../../../util/address';
import { buildRampTransferParams } from './buildRampTransferParams';

const FROM = '0x2990079bcdee240329a520d2444386fc119da21a';
const RECIPIENT = '0x1111111111111111111111111111111111111111';
const TOKEN = '0x2222222222222222222222222222222222222222';

describe('buildRampTransferParams', () => {
  it('builds a native transfer', () => {
    const amount = 10n ** 18n;

    expect(
      buildRampTransferParams({
        from: FROM,
        chainId: '0x1',
        assetAddress: NATIVE_ADDRESS,
        recipient: RECIPIENT,
        amount,
      }),
    ).toEqual({
      from: safeToChecksumAddress(FROM),
      to: RECIPIENT,
      value: bigIntToHex(amount),
      chainId: '0x1',
    });
  });

  it('builds an ERC-20 transfer with the amount and recipient encoded', () => {
    const amount = 123_456n;

    expect(
      buildRampTransferParams({
        from: FROM,
        chainId: '0x1',
        assetAddress: TOKEN,
        recipient: RECIPIENT,
        amount,
      }),
    ).toEqual({
      from: safeToChecksumAddress(FROM),
      to: safeToChecksumAddress(TOKEN),
      value: '0x0',
      data: generateTransferData('transfer', {
        toAddress: RECIPIENT,
        amount: bigIntToHex(amount),
      }),
      chainId: '0x1',
    });
  });

  it('returns undefined when the transaction shape is incomplete', () => {
    const complete = {
      from: FROM,
      chainId: '0x1' as const,
      assetAddress: NATIVE_ADDRESS,
      recipient: RECIPIENT,
      amount: 1n,
    };

    expect(buildRampTransferParams({ ...complete, from: undefined })).toBe(
      undefined,
    );
    expect(buildRampTransferParams({ ...complete, chainId: undefined })).toBe(
      undefined,
    );
    expect(
      buildRampTransferParams({ ...complete, assetAddress: undefined }),
    ).toBe(undefined);
    expect(buildRampTransferParams({ ...complete, recipient: undefined })).toBe(
      undefined,
    );
    expect(buildRampTransferParams({ ...complete, amount: undefined })).toBe(
      undefined,
    );
  });
});
