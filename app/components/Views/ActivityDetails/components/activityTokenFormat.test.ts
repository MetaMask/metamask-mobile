import { formatActivityTokenAmount } from './activityTokenFormat';
import { strings } from '../../../../../locales/i18n';
import type { TokenAmount } from '../../../../util/activity-adapters';

describe('formatActivityTokenAmount', () => {
  it('returns undefined when there is no token', () => {
    expect(formatActivityTokenAmount(undefined)).toBeUndefined();
  });

  it('renders unlimited approvals', () => {
    expect(
      formatActivityTokenAmount({
        isUnlimitedApproval: true,
        symbol: 'USDC',
        direction: 'out',
      } as TokenAmount),
    ).toBe(strings('confirm.unlimited'));
  });

  it('falls back to the symbol when there is no amount', () => {
    expect(
      formatActivityTokenAmount({
        symbol: 'ETH',
        direction: 'out',
      } as TokenAmount),
    ).toBe('ETH');
  });

  it('prefixes outgoing amounts with a minus sign', () => {
    const result = formatActivityTokenAmount({
      amount: '1000000000000000000',
      decimals: 18,
      symbol: 'ETH',
      direction: 'out',
    } as TokenAmount);

    expect(result?.startsWith('-')).toBe(true);
    expect(result?.endsWith(' ETH')).toBe(true);
  });

  it('prefixes incoming amounts with a plus sign by default', () => {
    const result = formatActivityTokenAmount({
      amount: '1000000',
      decimals: 6,
      symbol: 'USDC',
      direction: 'in',
    } as TokenAmount);

    expect(result?.startsWith('+')).toBe(true);
  });

  it('omits the plus sign when showPlus is false', () => {
    const result = formatActivityTokenAmount(
      {
        amount: '1000000',
        decimals: 6,
        symbol: 'USDC',
        direction: 'in',
      } as TokenAmount,
      { showPlus: false },
    );

    expect(result?.startsWith('+')).toBe(false);
    expect(result?.startsWith('-')).toBe(false);
    expect(result?.endsWith(' USDC')).toBe(true);
  });
});
