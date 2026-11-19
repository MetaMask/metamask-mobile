import { KYC_KALSHI_ERROR_CODES, KycApiError } from '@metamask/kyc-controller';
import { describeKalshiError, shouldRefreshAfter } from './kalshiErrors';

describe('describeKalshiError', () => {
  it('words every code the user can hit', () => {
    expect(
      Object.fromEntries(
        KYC_KALSHI_ERROR_CODES.map((code) => [
          code,
          describeKalshiError(new KycApiError(400, 'failed', code)),
        ]),
      ),
    ).toMatchInlineSnapshot(`
      {
        "idos_relay_unavailable": "The verification service is unavailable. Try again in a moment.",
        "invalid_or_expired_code": "That code is wrong or has expired. Check it and try again, or send a new code.",
        "kalshi_account_exists": "This phone number already has a Kalshi account. Linking an existing account isn’t supported yet.",
        "kalshi_signed_request_a2t_invalid": "MetaMask couldn’t prove your Kalshi sign-in. Try again.",
        "kalshi_signed_request_a2t_missing": "MetaMask couldn’t prove your Kalshi sign-in. Try again.",
        "kalshi_signed_request_body_invalid": "MetaMask couldn’t send this request to Kalshi. Try again. (kalshi_signed_request_body_invalid)",
        "kalshi_signed_request_email_mismatch": "MetaMask couldn’t send this request to Kalshi. Try again. (kalshi_signed_request_email_mismatch)",
        "kalshi_signed_request_path_not_allowed": "MetaMask couldn’t send this request to Kalshi. Try again. (kalshi_signed_request_path_not_allowed)",
        "kalshi_signed_request_rejected": "Kalshi couldn’t confirm this request. Try again.",
        "kalshi_signed_request_required": "MetaMask couldn’t send this request to Kalshi. Try again. (kalshi_signed_request_required)",
        "kalshi_signed_request_signature_missing": "MetaMask couldn’t send this request to Kalshi. Try again. (kalshi_signed_request_signature_missing)",
        "kalshi_signed_request_sub_mismatch": "This Kalshi sign-in doesn’t match your MetaMask account. Sign out of MetaMask, sign back in, and try again.",
        "kalshi_signed_requests_sequence_invalid": "MetaMask couldn’t send this request to Kalshi. Try again. (kalshi_signed_requests_sequence_invalid)",
        "not_found": "Kalshi couldn’t find this sign-up. Try again, and contact support if it keeps happening. (not_found)",
        "session_not_in_email_verification": "Kalshi isn’t waiting for an email code right now.",
      }
    `);
  });

  it.each([
    ['a plain error', new Error('network down')],
    ['an unknown code', new KycApiError(400, 'failed', 'something_else')],
    ['a string', 'nope'],
  ])('has nothing to say about %s', (_name, error) => {
    expect(describeKalshiError(error)).toBeUndefined();
  });
});

describe('shouldRefreshAfter', () => {
  it('reads the step again when the session is past the email code', () => {
    expect(
      shouldRefreshAfter(
        new KycApiError(412, 'failed', 'session_not_in_email_verification'),
      ),
    ).toBe(true);
  });

  it.each(
    KYC_KALSHI_ERROR_CODES.filter(
      (code) => code !== 'session_not_in_email_verification',
    ),
  )('stays put for %s', (code) => {
    expect(shouldRefreshAfter(new KycApiError(400, 'failed', code))).toBe(
      false,
    );
  });
});
