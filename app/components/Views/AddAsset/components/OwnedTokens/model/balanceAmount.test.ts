import { isPositiveReadableAmount, toReadableAmount } from './balanceAmount';
import { V6_RECORDED_BALANCE_ROWS } from './fixtures/v6BalanceFixture';

describe('toReadableAmount', () => {
  it('keeps the recorded USDC balance as a readable decimal', () => {
    const usdc = V6_RECORDED_BALANCE_ROWS.find(
      (row) => row.symbol === 'USDC' && row.decimals === 6,
    );

    const readable = toReadableAmount(usdc?.balance ?? '', usdc?.decimals ?? 6);

    expect(readable?.toString()).toBe('38.192124');
  });

  it('keeps the recorded 18-decimal DAI balance unscaled', () => {
    const dai = V6_RECORDED_BALANCE_ROWS.find((row) => row.symbol === 'DAI');

    const readable = toReadableAmount(dai?.balance ?? '', 18);

    expect(readable?.toString()).toBe('14.372082162212001768');
  });

  it('returns undefined for a blank or non-numeric balance', () => {
    expect(toReadableAmount('', 18)).toBeUndefined();
    expect(toReadableAmount('nope', 18)).toBeUndefined();
  });

  it('treats zero as non-positive and dust as positive', () => {
    const zero = toReadableAmount('0', 18);
    const dust = toReadableAmount('0.000000000000000001', 18);

    expect(zero && isPositiveReadableAmount(zero)).toBe(false);
    expect(dust && isPositiveReadableAmount(dust)).toBe(true);
  });
});
