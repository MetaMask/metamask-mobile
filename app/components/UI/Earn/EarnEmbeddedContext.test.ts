import { showEarnListBackButton } from './EarnEmbeddedContext';

describe('showEarnListBackButton', () => {
  it('hides the back arrow when Earn is opened from the footer', () => {
    expect(showEarnListBackButton(true)).toBe(false);
  });

  it('keeps the back arrow when Earn is pushed on its own', () => {
    expect(showEarnListBackButton(false)).toBe(true);
  });
});
