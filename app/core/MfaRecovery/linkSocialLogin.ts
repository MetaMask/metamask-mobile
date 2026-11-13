import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { getEnvUrls, type Env } from '@metamask/profile-sync-controller/sdk';
import { bytesToHex } from '@metamask/utils';

const PAIR_IDENTIFIER_PATH = '/api/v2/profile/pair/identifier';
const HTTP_CONFLICT = 409;
const MAX_REASON_LENGTH = 120;

const IDENTIFIER_TYPE_BY_AUTH_CONNECTION: Readonly<Record<string, string>> = {
  google: 'GOOGLE',
  apple: 'APPLE',
};

/** A failed link. Carries no token, email, or identifier. */
export class LinkSocialLoginError extends Error {
  readonly code: string;

  /** Non-secret hint: Auth's reason, with emails and tokens removed. */
  readonly detail?: string;

  constructor(code: string, detail?: string) {
    super(`Linking the social login failed: ${code}`);
    this.name = 'LinkSocialLoginError';
    this.code = code;
    this.detail = detail;
  }
}

export interface LinkSocialLoginDependencies {
  env: Env;
  seedlessState: {
    vault?: string;
    authConnection?: string;
    socialLoginEmail?: string;
  };
  /** The social provider token the wallet holds for its login. */
  getSocialAccessToken: () => Promise<string | undefined>;
  /** The Auth token proven with a second factor. Adding a login needs it. */
  getVerifiedAccessToken: () => string | undefined;
  /**
   * Dev verifier-replacement address. When set, Auth is asked to link this
   * instead of the Google address that was used to sign in.
   */
  verifierId?: string;
  fetchFn?: typeof fetch;
}

interface SocialTokenClaims {
  email?: string;
  sub?: string;
}

function readClaims(jwt: string): SocialTokenClaims {
  const payload = jwt.split('.')[1];
  if (!payload) {
    return {};
  }
  try {
    const claims: unknown = JSON.parse(
      Buffer.from(
        payload.replace(/-/gu, '+').replace(/_/gu, '/'),
        'base64',
      ).toString('utf8'),
    );
    if (typeof claims !== 'object' || claims === null) {
      return {};
    }
    const { email, sub } = claims as { email?: unknown; sub?: unknown };
    return {
      email: typeof email === 'string' && email.length > 0 ? email : undefined,
      sub: typeof sub === 'string' && sub.length > 0 ? sub : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Auth's Google identifier: the unprefixed hex keccak256 of the lowercased,
 * trimmed email. A Google social token's subject must equal it.
 */
function hashEmail(email: string): string {
  return bytesToHex(
    keccak256(new TextEncoder().encode(email.trim().toLowerCase())),
  ).slice(2);
}

function subjectMatchesEmail(sub: string, email: string): boolean {
  return sub.toLowerCase().replace(/^0x/u, '') === hashEmail(email);
}

/**
 * Picks the email Auth will accept for this token: the one whose hash is the
 * token's subject. A dev verifier replacement is tried first, then the
 * token's own email, then the stored one.
 */
function chooseEmail(
  claims: SocialTokenClaims,
  storedEmail: string | undefined,
  preferredEmail: string | undefined,
): { email?: string; matchesSubject: boolean | undefined } {
  const candidates = [preferredEmail, claims.email, storedEmail].filter(
    (candidate): candidate is string => Boolean(candidate),
  );
  if (!claims.sub) {
    return { email: candidates[0], matchesSubject: undefined };
  }
  const { sub } = claims;
  const matching = candidates.find((candidate) =>
    subjectMatchesEmail(sub, candidate),
  );
  return matching
    ? { email: matching, matchesSubject: true }
    : { email: candidates[0], matchesSubject: false };
}

function redact(text: string): string {
  return text
    .replace(/[^\s"'@]+@[^\s"'@]+/gu, '<email>')
    .replace(/[A-Za-z0-9+/_=-]{24,}/gu, '<redacted>')
    .slice(0, MAX_REASON_LENGTH);
}

async function readReason(response: Response): Promise<string> {
  try {
    const text = await response.text();
    try {
      const body: unknown = JSON.parse(text);
      if (typeof body === 'object' && body !== null) {
        const { message, error_description: description } = body as {
          message?: unknown;
          error_description?: unknown;
        };
        const reason = [message, description].find(
          (value): value is string => typeof value === 'string',
        );
        if (reason) {
          return redact(reason);
        }
      }
    } catch {
      // Not JSON. Use the raw text below.
    }
    return redact(text);
  } catch {
    return 'no reason given';
  }
}

/**
 * Attaches the wallet's Google or Apple login to its Auth profile, so Auth
 * lists it as a recovery identifier. Uses the same request the Auth
 * controller makes when its own pairing is enabled.
 *
 * @param dependencies - The Auth environment, seedless state, and token getters.
 * @throws {LinkSocialLoginError} When the login cannot be linked.
 */
export async function linkSocialLogin({
  env,
  seedlessState,
  getSocialAccessToken,
  getVerifiedAccessToken,
  verifierId,
  fetchFn = fetch,
}: LinkSocialLoginDependencies): Promise<void> {
  const identifierType = seedlessState.authConnection
    ? IDENTIFIER_TYPE_BY_AUTH_CONNECTION[seedlessState.authConnection]
    : undefined;
  if (!seedlessState.vault || !identifierType) {
    throw new LinkSocialLoginError('social_login_unavailable');
  }

  const socialJwt = await getSocialAccessToken();
  if (!socialJwt) {
    throw new LinkSocialLoginError('social_token_unavailable');
  }
  const verifiedToken = getVerifiedAccessToken();
  if (!verifiedToken) {
    throw new LinkSocialLoginError('verification_token_unavailable');
  }

  const preferredEmail = verifierId?.trim() || undefined;
  const { email, matchesSubject } = chooseEmail(
    readClaims(socialJwt),
    seedlessState.socialLoginEmail,
    preferredEmail || undefined,
  );
  if (identifierType === 'GOOGLE' && !email) {
    throw new LinkSocialLoginError('social_email_unavailable');
  }

  const response = await fetchFn(
    `${getEnvUrls(env).authApiUrl}${PAIR_IDENTIFIER_PATH}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifiedToken}`,
      },
      body: JSON.stringify({
        identifier_type: identifierType,
        social_jwt: socialJwt,
        ...(email ? { email } : {}),
      }),
    },
  );

  if (!response.ok) {
    const subjectHint =
      matchesSubject === undefined
        ? 'token has no subject'
        : `email matches token subject: ${matchesSubject}`;
    throw new LinkSocialLoginError(
      response.status === HTTP_CONFLICT
        ? 'social_linked_to_other_profile'
        : `social_link_http_${response.status}`,
      `${await readReason(response)} (${subjectHint})`,
    );
  }
}
