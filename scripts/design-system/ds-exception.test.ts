import { readExceptionReason } from './ds-exception';

describe('readExceptionReason', () => {
  it('returns the trimmed reason from a line comment value', () => {
    const commentValue = ' ds-exception: local seed, keep the raw gap';

    const reason = readExceptionReason(commentValue);

    expect(reason).toBe('local seed, keep the raw gap');
  });

  it.each([
    [' icon gap'],
    [' ds-exception:'],
    [' ds-exception:   '],
  ])('returns undefined for %j', (commentValue) => {
    expect(readExceptionReason(commentValue)).toBeUndefined();
  });
});
