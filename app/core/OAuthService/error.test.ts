import {
  OAuthError,
  OAuthErrorType,
  isOAuthUserCancellationMessage,
  isSocialLoginAuthSessionDismissed,
} from './error';

describe('OAuth error helpers', () => {
  describe('isOAuthUserCancellationMessage', () => {
    it('detects Apple authorization cancel messages', () => {
      expect(
        isOAuthUserCancellationMessage(
          'The user canceled the authorization attempt',
        ),
      ).toBe(true);
    });

    it('detects American spelling canceled', () => {
      expect(isOAuthUserCancellationMessage('One Tap was canceled')).toBe(true);
    });

    it('detects dismiss wording', () => {
      expect(
        isOAuthUserCancellationMessage('User dismissed the login process'),
      ).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isOAuthUserCancellationMessage('Network request failed')).toBe(
        false,
      );
    });
  });

  describe('isSocialLoginAuthSessionDismissed', () => {
    it('returns true for UserCancelled and UserDismissed', () => {
      expect(
        isSocialLoginAuthSessionDismissed(
          new OAuthError('cancel', OAuthErrorType.UserCancelled),
        ),
      ).toBe(true);
      expect(
        isSocialLoginAuthSessionDismissed(
          new OAuthError('dismiss', OAuthErrorType.UserDismissed),
        ),
      ).toBe(true);
    });

    it('returns true for provider errors with cancel wording', () => {
      expect(
        isSocialLoginAuthSessionDismissed(
          new OAuthError(
            'Apple login error - The user canceled the authorization attempt',
            OAuthErrorType.AppleLoginError,
          ),
        ),
      ).toBe(true);
    });

    it('returns false for non-OAuth errors', () => {
      expect(isSocialLoginAuthSessionDismissed(new Error('cancel'))).toBe(
        false,
      );
    });
  });
});
