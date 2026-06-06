import type { PaymentMethod } from '@metamask/ramps-controller';
import { pickEligiblePaymentMethod } from './pickEligiblePaymentMethod';

const method = (id: string, delay?: number[]): PaymentMethod =>
  ({ id, name: id, delay }) as unknown as PaymentMethod;

describe('pickEligiblePaymentMethod', () => {
  it('returns undefined for an empty list', () => {
    expect(pickEligiblePaymentMethod([], 10)).toBeUndefined();
  });

  it('treats a method with no delay band as eligible', () => {
    const card = method('card');
    expect(pickEligiblePaymentMethod([card], 0)).toBe(card);
  });

  it('returns the first method within the max delay', () => {
    const fast = method('fast', [0, 5]);
    const slow = method('slow', [0, 30]);
    expect(pickEligiblePaymentMethod([fast, slow], 10)).toBe(fast);
  });

  it('treats an upper-bound delay equal to the max as eligible (inclusive)', () => {
    const exact = method('exact', [0, 10]);
    expect(pickEligiblePaymentMethod([exact], 10)).toBe(exact);
  });

  it('skips methods whose delay exceeds the max and picks the next eligible one', () => {
    const tooSlow = method('too-slow', [0, 30]);
    const ok = method('ok', [0, 5]);
    expect(pickEligiblePaymentMethod([tooSlow, ok], 10)).toBe(ok);
  });

  it('returns undefined when every method exceeds the max delay', () => {
    const a = method('a', [0, 30]);
    const b = method('b', [0, 60]);
    expect(pickEligiblePaymentMethod([a, b], 10)).toBeUndefined();
  });

  it('preserves preference order (first eligible wins)', () => {
    const first = method('first', [0, 5]);
    const second = method('second', [0, 5]);
    expect(pickEligiblePaymentMethod([first, second], 10)).toBe(first);
  });
});
