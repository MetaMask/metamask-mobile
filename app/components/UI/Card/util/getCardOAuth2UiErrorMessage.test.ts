import { getCardOAuth2UiErrorMessage } from './getCardOAuth2UiErrorMessage';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'card.card_authentication.errors.oauth.access_denied': 'denied-msg',
      'card.card_authentication.errors.oauth.temporarily_unavailable':
        'unavailable-msg',
      'card.card_authentication.errors.oauth.login_required': 'login-msg',
      'card.card_authentication.errors.oauth.session_expired': 'session-msg',
      'card.card_authentication.errors.unknown_error': 'unknown-msg',
    };
    return map[key] ?? key;
  },
}));

describe('getCardOAuth2UiErrorMessage', () => {
  it('returns mapped copy for access_denied', () => {
    const message = getCardOAuth2UiErrorMessage('access_denied');

    expect(message).toBe('denied-msg');
  });

  it('returns unknown copy for an unrecognized error code', () => {
    const message = getCardOAuth2UiErrorMessage('unsupported_code');

    expect(message).toBe('unknown-msg');
  });

  it('returns unknown copy when code is empty', () => {
    const message = getCardOAuth2UiErrorMessage(undefined);

    expect(message).toBe('unknown-msg');
  });
});
