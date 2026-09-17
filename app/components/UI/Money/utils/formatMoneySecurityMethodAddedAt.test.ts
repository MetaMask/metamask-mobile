import { formatMoneySecurityMethodAddedAt } from './formatMoneySecurityMethodAddedAt';

describe('formatMoneySecurityMethodAddedAt', () => {
  it('formats the timestamp without timezone details', () => {
    const result = formatMoneySecurityMethodAddedAt(
      new Date(2026, 8, 17, 0, 34),
    );

    expect(result).toBe('Added Sep 17, 2026 at 12:34 AM');
    expect(result).not.toContain('GMT');
  });
});
