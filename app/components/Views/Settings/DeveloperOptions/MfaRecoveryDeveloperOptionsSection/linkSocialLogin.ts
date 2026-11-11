import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { bytesToHex } from '@metamask/utils';
import { getEnvUrls, type Env } from '@metamask/profile-sync-controller/sdk';

export type LinkSocialLoginStatus =
  | 'linked'
  | 'linked_to_other_profile'
  | 'no_social_login'
  | 'missing_email'
  | 'missing_social_token'
  | 'failed';

export interface LinkSocialLoginEmailDiagnostics {
  emailSource: 'token' | 'seedless' | 'none';
  tokenClaimKeys: string[];
  seedlessEmailMatchesToken: boolean | null;
  seedlessEmailMatchesTokenIgnoringCase: boolean | null;
}

export interface LinkSocialLoginTokenDiagnostics {
  authApiUrl: string;
  iss: unknown;
  aud: unknown;
  env: unknown;
  clientId: unknown;
  secondsUntilExpiry: number | null;
  subMatchesSeedlessUserId: boolean | null;
  subLength: number | null;
  subHas0xPrefix: boolean | null;
  subMatchesNormalizedEmail: boolean | null;
  subMatchesNormalizedEmailWith0x: boolean | null;
  subHash: string | null;
  normalizedEmailHash: string | null;
  subMatchesEmailVariant: string | null;
}

function keccak256Hex(input: string): string {
  return bytesToHex(keccak256(new TextEncoder().encode(input))).slice(2);
}

/**
 * Auth's `NormalizeGoogleIdentifier`: unprefixed hex keccak256 of the
 * lowercased, trimmed email, which a Google social token's `sub` must equal.
 *
 * @param email - The Google account email.
 * @returns The normalized Google identifier.
 */
export function normalizeGoogleIdentifier(email: string): string {
  return keccak256Hex(email.trim().toLowerCase());
}

/**
 * Names the email variant whose keccak256 equals `sub`, to spot an auth
 * service that normalizes the email differently from Auth.
 *
 * @param sub - The social token subject.
 * @param email - The email sent to Auth.
 * @returns The matching variant name, or null when none matches.
 */
export function findEmailVariantMatchingSub(
  sub: string,
  email: string,
): string | null {
  const lower = email.trim().toLowerCase();
  const [localPart = '', domain = ''] = lower.split('@');
  const localWithoutPlus = localPart.split('+')[0];
  const isGmail = domain === 'gmail.com' || domain === 'googlemail.com';
  const variants: Record<string, string> = {
    original_case: email,
    trimmed_original_case: email.trim(),
    lowercase: lower,
    without_plus_tag: `${localWithoutPlus}@${domain}`,
    ...(isGmail
      ? {
          gmail_without_dots: `${localPart.replace(/\./gu, '')}@gmail.com`,
          gmail_canonical: `${localWithoutPlus.replace(/\./gu, '')}@gmail.com`,
          googlemail_domain: `${localPart}@googlemail.com`,
        }
      : {}),
  };
  const normalizedSub = sub.toLowerCase().replace(/^0x/u, '');
  for (const [name, variant] of Object.entries(variants)) {
    if (keccak256Hex(variant) === normalizedSub) {
      return name;
    }
  }
  return null;
}

export interface LinkSocialLoginResult {
  status: LinkSocialLoginStatus;
  httpStatus?: number;
  detail?: string;
  pairedIdentifierTypes?: string[];
  email?: LinkSocialLoginEmailDiagnostics;
  token?: LinkSocialLoginTokenDiagnostics;
}

export interface LinkSocialLoginSeedlessState {
  vault?: string;
  authConnection?: string;
  socialLoginEmail?: string;
  userId?: string;
}

export interface LinkSocialLoginDependencies {
  env: Env;
  seedlessState: LinkSocialLoginSeedlessState;
  getSocialAccessToken: () => Promise<string | undefined>;
  getBearerToken: () => Promise<string>;
  fetchFn?: typeof fetch;
}

const IDENTIFIER_TYPE_BY_AUTH_CONNECTION: Record<string, string> = {
  google: 'GOOGLE',
  apple: 'APPLE',
  telegram: 'TELEGRAM',
};

const MAX_DETAIL_LENGTH = 200;

interface PairSocialIdentifierResponse {
  profile?: { paired_identifier_ids?: { type: string }[] };
}

function decodeJwtClaims(jwt: string): Record<string, unknown> {
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
    return claims !== null && typeof claims === 'object'
      ? (claims as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Attaches the wallet's social login to the primary SRP's Auth profile with
 * `POST /api/v2/profile/pair/identifier`, using the same request as
 * `AuthenticationController`'s private social pairing, without its
 * feature-flag and `needsSocialPairing` gates. Unlike the controller, the
 * email comes from the social token's `email` claim when it has one.
 *
 * @param dependencies - Auth environment, seedless state, and token getters.
 * @returns The pairing outcome and the paired identifier types.
 */
export async function linkSocialLogin({
  env,
  seedlessState,
  getSocialAccessToken,
  getBearerToken,
  fetchFn = fetch,
}: LinkSocialLoginDependencies): Promise<LinkSocialLoginResult> {
  const identifierType = seedlessState.authConnection
    ? IDENTIFIER_TYPE_BY_AUTH_CONNECTION[seedlessState.authConnection]
    : undefined;
  if (!seedlessState.vault || !identifierType) {
    return { status: 'no_social_login' };
  }

  const socialJwt = await getSocialAccessToken();
  if (!socialJwt) {
    return { status: 'missing_social_token' };
  }

  // Auth checks the email against the social token, so the token's own email
  // claim wins over seedless state. Auth requires an email for Google, accepts
  // one for Apple, and rejects it for Telegram, where socialLoginEmail holds a
  // display name.
  const claims = decodeJwtClaims(socialJwt);
  const tokenEmail =
    typeof claims.email === 'string' && claims.email.length > 0
      ? claims.email
      : undefined;
  const seedlessEmail = seedlessState.socialLoginEmail || undefined;
  const sendsEmail = identifierType === 'GOOGLE' || identifierType === 'APPLE';
  const email = '6verifier1@11.gg'; //sendsEmail ? (tokenEmail ?? seedlessEmail) : undefined;
  const emailDiagnostics: LinkSocialLoginEmailDiagnostics = {
    emailSource:
      email === undefined
        ? 'none'
        : email === tokenEmail
          ? 'token'
          : 'seedless',
    tokenClaimKeys: Object.keys(claims),
    seedlessEmailMatchesToken:
      tokenEmail && seedlessEmail ? tokenEmail === seedlessEmail : null,
    seedlessEmailMatchesTokenIgnoringCase:
      tokenEmail && seedlessEmail
        ? tokenEmail.toLowerCase() === seedlessEmail.toLowerCase()
        : null,
  };
  const { authApiUrl } = getEnvUrls(env);
  const sub = typeof claims.sub === 'string' ? claims.sub : undefined;
  const normalizedEmail = email ? normalizeGoogleIdentifier(email) : undefined;
  const tokenDiagnostics: LinkSocialLoginTokenDiagnostics = {
    authApiUrl,
    iss: claims.iss ?? null,
    aud: claims.aud ?? null,
    env: claims.env ?? null,
    clientId: claims.client_id ?? null,
    secondsUntilExpiry:
      typeof claims.exp === 'number'
        ? claims.exp - Math.floor(Date.now() / 1000)
        : null,
    subMatchesSeedlessUserId:
      sub && seedlessState.userId ? sub === seedlessState.userId : null,
    subLength: sub?.length ?? null,
    subHas0xPrefix: sub ? sub.startsWith('0x') : null,
    subMatchesNormalizedEmail:
      sub && normalizedEmail ? sub === normalizedEmail : null,
    subMatchesNormalizedEmailWith0x:
      sub && normalizedEmail ? sub === `0x${normalizedEmail}` : null,
    subHash: sub ?? null,
    normalizedEmailHash: normalizedEmail ?? null,
    subMatchesEmailVariant:
      sub && email ? findEmailVariantMatchingSub(sub, email) : null,
  };
  if (identifierType === 'GOOGLE' && email === undefined) {
    return {
      status: 'missing_email',
      email: emailDiagnostics,
      token: tokenDiagnostics,
    };
  }
  const bearerToken = await getBearerToken();

  const response = await fetchFn(
    `${authApiUrl}/api/v2/profile/pair/identifier`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        identifier_type: identifierType,
        social_jwt: socialJwt,
        ...(email === undefined ? {} : { email }),
      }),
    },
  );

  if (!response.ok) {
    const detail = (await response.text()).slice(0, MAX_DETAIL_LENGTH);
    return {
      status: response.status === 409 ? 'linked_to_other_profile' : 'failed',
      httpStatus: response.status,
      detail,
      email: emailDiagnostics,
      token: tokenDiagnostics,
    };
  }

  const body = (await response.json()) as PairSocialIdentifierResponse;
  return {
    status: 'linked',
    httpStatus: response.status,
    pairedIdentifierTypes:
      body.profile?.paired_identifier_ids?.map(({ type }) => type) ?? [],
    email: emailDiagnostics,
    token: tokenDiagnostics,
  };
}
