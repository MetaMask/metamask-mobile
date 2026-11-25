import type { PredictAmount } from '../../types';
import {
  decodeUsdcTransfer,
  encodeUsdcTransfer,
  isSameUsdAmount,
  toUsdcBaseUnits,
} from './usdcTransfer';

const RECIPIENT = '0x3b0b371ae3cb08f272b87319684f6518b3b313a0';
const amount = (value: string) => value as PredictAmount;

describe('toUsdcBaseUnits', () => {
  it.each([
    ['25.00', BigInt(25_000_000)],
    ['25', BigInt(25_000_000)],
    ['25.5', BigInt(25_500_000)],
    ['25.50', BigInt(25_500_000)],
    ['0.01', BigInt(10_000)],
    ['1', BigInt(1_000_000)],
    ['123456789.99', BigInt('123456789990000')],
  ])('converts %s USD to %s base units', (usd, baseUnits) => {
    expect(toUsdcBaseUnits(usd)).toBe(baseUnits);
  });

  it.each(['25.001', '-1', '1e3', ' 25', '25 ', '.5', '25.', '', 'abc'])(
    'refuses %p instead of rounding it',
    (usd) => {
      expect(toUsdcBaseUnits(usd)).toBeUndefined();
    },
  );
});

describe('isSameUsdAmount', () => {
  it('compares amounts as exact base units', () => {
    expect(isSameUsdAmount('25.5', '25.50')).toBe(true);
    expect(isSameUsdAmount('25', '25.00')).toBe(true);
    expect(isSameUsdAmount('25.50', '25.51')).toBe(false);
    expect(isSameUsdAmount('25.501', '25.50')).toBe(false);
  });
});

describe('encodeUsdcTransfer', () => {
  it('locks the transfer bytes: selector, recipient word and $25.00 as 25000000 base units', () => {
    expect(encodeUsdcTransfer(RECIPIENT, amount('25.00'))).toBe(
      '0xa9059cbb' +
        '0000000000000000000000003b0b371ae3cb08f272b87319684f6518b3b313a0' +
        '00000000000000000000000000000000000000000000000000000000017d7840',
    );
  });

  it('encodes cents exactly: $25.50 is 25500000 base units', () => {
    const data = encodeUsdcTransfer(RECIPIENT, amount('25.50'));

    expect(data.slice(-64)).toBe(
      BigInt(25_500_000).toString(16).padStart(64, '0'),
    );
    expect(decodeUsdcTransfer(data)).toStrictEqual({
      recipient: RECIPIENT,
      baseUnits: BigInt(25_500_000),
    });
  });

  it('lowercases a checksummed recipient in the address word', () => {
    expect(
      encodeUsdcTransfer(
        '0x3B0B371AE3CB08F272B87319684F6518B3B313A0',
        amount('1'),
      ),
    ).toBe(encodeUsdcTransfer(RECIPIENT, amount('1')));
  });

  it('throws on a recipient that is not an address', () => {
    expect(() => encodeUsdcTransfer('0x1234', amount('1'))).toThrow(
      'Invalid USDC transfer recipient',
    );
  });

  it('throws on an amount it cannot encode exactly', () => {
    expect(() => encodeUsdcTransfer(RECIPIENT, amount('1.001'))).toThrow(
      'Invalid USDC transfer amount',
    );
  });
});

describe('decodeUsdcTransfer', () => {
  const valid = encodeUsdcTransfer(RECIPIENT, amount('25.00'));

  it('reads back the recipient and the base units', () => {
    expect(decodeUsdcTransfer(valid)).toStrictEqual({
      recipient: RECIPIENT,
      baseUnits: BigInt(25_000_000),
    });
  });

  it('reads an uppercase selector', () => {
    expect(decodeUsdcTransfer(`0xA9059CBB${valid.slice(10)}`)).toStrictEqual({
      recipient: RECIPIENT,
      baseUnits: BigInt(25_000_000),
    });
  });

  it.each([
    ['no data', undefined],
    ['another method', `0x095ea7b3${valid.slice(10)}`],
    ['trailing bytes', `${valid}00`],
    ['a missing word', valid.slice(0, -64)],
    ['a dirty address word', `0xa9059cbb${'1'.repeat(24)}${valid.slice(34)}`],
    ['non-hex bytes', `${valid.slice(0, -1)}z`],
  ])('refuses %s', (_label, data) => {
    expect(decodeUsdcTransfer(data)).toBeUndefined();
  });
});
