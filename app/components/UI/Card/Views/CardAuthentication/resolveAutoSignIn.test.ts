import { resolveAutoSignIn } from './resolveAutoSignIn';

describe('resolveAutoSignIn', () => {
  it('signs in when Card opens straight onto the sign-in screen', () => {
    expect(resolveAutoSignIn({ isLoneRoute: true })).toBe(true);
  });

  it('signs in when the entry point asks for it', () => {
    expect(resolveAutoSignIn({ autoSignIn: true, isLoneRoute: false })).toBe(
      true,
    );
  });

  it('does not sign in after logout or an expired session', () => {
    expect(resolveAutoSignIn({ autoSignIn: false, isLoneRoute: true })).toBe(
      false,
    );
  });

  it('does not sign in for a re-auth prompt', () => {
    expect(
      resolveAutoSignIn({
        showAuthPrompt: true,
        autoSignIn: true,
        isLoneRoute: true,
      }),
    ).toBe(false);
  });
});
