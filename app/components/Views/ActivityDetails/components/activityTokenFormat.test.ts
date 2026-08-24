import { renderHook } from '@testing-library/react-native';
import { useFormatActivityTokenAmount } from './activityTokenFormat';
import { strings } from '../../../../../locales/i18n';
import type { TokenAmount } from '../../../../util/activity-adapters';

const formatToken = (
  token: TokenAmount | undefined,
  options?: { showPlus?: boolean },
) => {
  const { result } = renderHook(() => useFormatActivityTokenAmount());
  return result.current(token, options);
};

describe('useFormatActivityTokenAmount', () => {
  it('returns undefined when there is no token', () => {
    expect(formatToken(undefined)).toBeUndefined();
  });

  it('renders unlimited approvals', () => {
    expect(
      formatToken({
        isUnlimitedApproval: true,
        symbol: 'USDC',
        direction: 'out',
      } as TokenAmount),
    ).toBe(strings('confirm.unlimited'));
  });

  it('treats a missing amount with symbol as zero', () => {
    expect(
      formatToken({
        symbol: 'ETH',
        direction: 'out',
      } as TokenAmount),
    ).toBe('-0 ETH');
  });

  it('prefixes outgoing amounts with a minus sign', () => {
    expect(
      formatToken({
        amount: '1714557',
        decimals: 6,
        symbol: 'USDC',
        direction: 'out',
      } as TokenAmount),
    ).toBe('-1.7146 USDC');
  });

  it('prefixes incoming amounts with a plus sign by default', () => {
    expect(
      formatToken({
        amount: '745596683158496',
        decimals: 18,
        symbol: 'ETH',
        direction: 'in',
      } as TokenAmount),
    ).toBe('+0.0007456 ETH');
  });

  it('shows non-zero incoming amounts that round to zero as less than the minimum display quantity', () => {
    expect(
      formatToken({
        amount: '1000000000000',
        decimals: 18,
        symbol: 'ETH',
        direction: 'in',
      } as TokenAmount),
    ).toBe('+<0.00001 ETH');
  });

  it('omits the plus sign when showPlus is false', () => {
    const result = formatToken(
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

  it('omits the trailing separator when the token has no symbol', () => {
    expect(
      formatToken({
        amount: '1000000',
        decimals: 6,
        direction: 'in',
      } as TokenAmount),
    ).toBe('+1');
  });

  it('renders a non-numeric amount verbatim instead of a bare sign', () => {
    expect(
      formatToken({
        amount: '1,714.55',
        symbol: 'USDC',
        direction: 'out',
      } as TokenAmount),
    ).toBe('-1,714.55 USDC');
  });
});
