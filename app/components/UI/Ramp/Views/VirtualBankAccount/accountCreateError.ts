export const ACCOUNT_CREATE_ERROR_VARIANTS = ['details', 'generic'] as const;

export type AccountCreateErrorVariant =
  (typeof ACCOUNT_CREATE_ERROR_VARIANTS)[number];

export const ACCOUNT_CREATE_ERROR_DESTINATION = {
  details: 'accountCreateDetails',
  generic: 'accountCreateGeneric',
} as const;

export type AccountCreateErrorDestinationId =
  (typeof ACCOUNT_CREATE_ERROR_DESTINATION)[keyof typeof ACCOUNT_CREATE_ERROR_DESTINATION];

const FIAT_ADDRESS_STATUSES = [
  'AuthorizationFailed',
  'AuthorizationRequired',
  'RegistrationPending',
  'RegistrationFailed',
  'Registered',
] as const;

export type FiatAddressStatus = (typeof FIAT_ADDRESS_STATUSES)[number];

export type AccountCreateHttpStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500;

export type AccountCreateRegistrationResult =
  | {
      kind: 'http';
      status: AccountCreateHttpStatus;
      traceId?: string;
    }
  | {
      kind: 'fiat';
      status: FiatAddressStatus;
    };

export const isAccountCreateErrorDestination = (
  destinationId: string,
): destinationId is AccountCreateErrorDestinationId =>
  destinationId === ACCOUNT_CREATE_ERROR_DESTINATION.details ||
  destinationId === ACCOUNT_CREATE_ERROR_DESTINATION.generic;

export const accountCreateErrorVariantForDestination = (
  destinationId: AccountCreateErrorDestinationId,
): AccountCreateErrorVariant => {
  switch (destinationId) {
    case ACCOUNT_CREATE_ERROR_DESTINATION.details:
      return 'details';
    case ACCOUNT_CREATE_ERROR_DESTINATION.generic:
      return 'generic';
  }
};

/**
 * Picks the account-creation screen for a MoonPay registration response.
 * Success, an existing account, email verification, and `RegistrationPending`
 * return null. Pending stays on the creating-account spinner.
 *
 * @param result - HTTP error or 200 fiat-address status.
 * @returns The screen variant, or null when this result is not an error screen.
 */
export const getAccountCreateErrorVariant = (
  result: AccountCreateRegistrationResult,
): AccountCreateErrorVariant | null => {
  if (result.kind === 'fiat') {
    switch (result.status) {
      case 'AuthorizationFailed':
      case 'RegistrationFailed':
        return 'details';
      case 'RegistrationPending':
      case 'AuthorizationRequired':
      case 'Registered':
        return null;
      default:
        return null;
    }
  }

  switch (result.status) {
    case 400:
    case 403:
    case 422:
      return 'details';
    case 401:
    case 404:
    case 500:
      return 'generic';
    case 409:
      return null;
    default:
      return null;
  }
};

export interface AccountCreateFailureFields {
  httpStatus: number;
  fiatStatus?: FiatAddressStatus;
  traceId?: string;
}

const SUPPORT_PARAM_HTTP_STATUS = 'http_status';
const SUPPORT_PARAM_FIAT_STATUS = 'fiat_status';
const SUPPORT_PARAM_TRACE_ID = 'trace_id';

/**
 * Fields safe to log for a registration failure. The response body is omitted
 * because invalid-data errors can echo bank details.
 *
 * @param result - HTTP error or 200 fiat-address status.
 * @returns Status identifiers and `traceId` when MoonPay sent one.
 */
export const getAccountCreateFailureLogFields = (
  result: AccountCreateRegistrationResult,
): AccountCreateFailureFields => {
  if (result.kind === 'fiat') {
    return { httpStatus: 200, fiatStatus: result.status };
  }

  return {
    httpStatus: result.status,
    ...(result.traceId ? { traceId: result.traceId } : {}),
  };
};

/**
 * Adds the safe registration identifiers to the help-center URL. The response
 * body stays off the URL. Consent still adds the app version and customer
 * service token only when the user agrees to share device details.
 *
 * @param baseUrl - Help-center URL, including its existing query string.
 * @param fields - HTTP status, fiat status, and MoonPay trace id.
 * @returns The same URL with those identifiers appended.
 */
export const buildAccountCreateSupportUrl = (
  baseUrl: string,
  fields?: AccountCreateFailureFields,
): string => {
  if (!fields) {
    return baseUrl;
  }

  const url = new URL(baseUrl);
  url.searchParams.set(SUPPORT_PARAM_HTTP_STATUS, String(fields.httpStatus));
  if (fields.fiatStatus) {
    url.searchParams.set(SUPPORT_PARAM_FIAT_STATUS, fields.fiatStatus);
  }
  if (fields.traceId) {
    url.searchParams.set(SUPPORT_PARAM_TRACE_ID, fields.traceId);
  }
  return url.toString();
};
