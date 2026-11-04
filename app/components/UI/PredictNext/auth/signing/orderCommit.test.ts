import { amountToCents } from './orderCommit';

describe('amountToCents', () => {
  it.each([
    ['5', 500],
    ['0.5', 50],
    ['12.34', 1234],
  ])('reads %s as %d cents', (amount, cents) => {
    expect(amountToCents(amount)).toBe(cents);
  });

  it.each(['', '1.234', '-1', '1,5', 'abc'])('refuses %p', (amount) => {
    expect(amountToCents(amount)).toBeUndefined();
  });
});
