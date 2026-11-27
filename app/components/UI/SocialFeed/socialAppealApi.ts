import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';

/** Longest `email` the social API accepts. */
export const SOCIAL_APPEAL_EMAIL_MAX_LENGTH = 254;
/** Longest `description` the social API accepts. */
export const SOCIAL_APPEAL_DESCRIPTION_MAX_LENGTH = 5000;

/** Body of `POST /api/v1/appeal`. */
export interface SocialAppealRequest {
  /** Where support can reach the user about the appeal. */
  email: string;
  /** Why the user is appealing. */
  description: string;
  /** Ticket title. The API defaults it to "Appeal from <username>". */
  title?: string;
}

/** The ticket the API opened for the appeal. */
export interface SocialAppealResponse {
  ticketId: string;
}

/**
 * The social API refused or failed the appeal.
 *
 * `httpStatus` is the HTTP status: 400 invalid body, 401 no valid session,
 * 429 too many appeals in the last hour, 502/504 the support tool failed.
 */
export class SocialAppealHttpError extends Error {
  /** Named to match what the social telemetry reads from HTTP errors. */
  readonly httpStatus: number;

  constructor(httpStatus: number) {
    super(`Social appeal request failed: ${httpStatus}`);
    this.name = 'SocialAppealHttpError';
    this.httpStatus = httpStatus;
  }
}

const readTicketId = (body: unknown): string => {
  const ticketId =
    body && typeof body === 'object' && 'ticketId' in body
      ? body.ticketId
      : undefined;
  if (typeof ticketId !== 'string') {
    throw new Error('Social appeal response has no ticketId');
  }
  return ticketId;
};

/**
 * Opens a support ticket to appeal a moderation decision
 * (`POST /api/v1/appeal` on `SOCIAL_API_URL`).
 *
 * Auth is the bearer token the other social-api calls send. The API reads the
 * username from the viewer's profile, so it is not part of the request.
 */
export const submitSocialAppeal = async (
  request: SocialAppealRequest,
  signal?: AbortSignal,
): Promise<SocialAppealResponse> => {
  const url = `${AppConstants.SOCIAL_API_URL.replace(/\/$/, '')}/api/v1/appeal`;
  const token = await Engine.controllerMessenger.call(
    'AuthenticationController:getBearerToken',
  );
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok) {
    throw new SocialAppealHttpError(response.status);
  }
  const json: unknown = await response.json();
  return { ticketId: readTicketId(json) };
};
