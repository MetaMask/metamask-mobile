import { readExceptionReason } from './ds-exception';

describe('readExceptionReason', () => {
  it('returns the trimmed reason from a line comment value', () => {
    const commentValue = ' ds-exception: local seed, keep the raw gap';

    const reason = readExceptionReason(commentValue);

    expect(reason).toBe('local seed, keep the raw gap');
  });

  it('returns undefined when the marker is missing', () => {
    const commentValue = ' icon gap';

    const reason = readExceptionReason(commentValue);

    expect(reason).toBeUndefined();
  });

  it('returns undefined when the reason is empty', () => {
    const commentValue = ' ds-exception:';

    const reason = readExceptionReason(commentValue);

    expect(reason).toBeUndefined();
  });

  it('returns undefined when the reason is only whitespace', () => {
    const commentValue = ' ds-exception:   ';

    const reason = readExceptionReason(commentValue);

    expect(reason).toBeUndefined();
  });
});
