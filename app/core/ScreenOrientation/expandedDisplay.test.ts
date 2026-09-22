import { isExpandedDisplaySize } from './expandedDisplay';

describe('isExpandedDisplaySize', () => {
  it('returns false for a phone-sized window', () => {
    const expanded = isExpandedDisplaySize(440, 956);

    expect(expanded).toBe(false);
  });

  it('returns false for the iPhone Duo cover screen', () => {
    const expanded = isExpandedDisplaySize(466, 678);

    expect(expanded).toBe(false);
  });

  it('returns true for the unfolded display in landscape', () => {
    const expanded = isExpandedDisplaySize(951, 669);

    expect(expanded).toBe(true);
  });

  it('returns true for the unfolded display in portrait', () => {
    const expanded = isExpandedDisplaySize(669, 951);

    expect(expanded).toBe(true);
  });
});
