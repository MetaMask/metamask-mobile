import Logger from '../../../../../util/Logger';

export const ACCOUNT_CREATE_ERROR_VARIANTS = [
  'blocked',
  'details',
  'generic',
] as const;

export type AccountCreateErrorVariant =
  (typeof ACCOUNT_CREATE_ERROR_VARIANTS)[number];

export const ACCOUNT_CREATE_ERROR_DESTINATION = {
  blocked: 'accountCreateBlocked',
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
  destinationId === ACCOUNT_CREATE_ERROR_DESTINATION.blocked ||
  destinationId === ACCOUNT_CREATE_ERROR_DESTINATION.details ||
  destinationId === ACCOUNT_CREATE_ERROR_DESTINATION.generic;

export const accountCreateErrorVariantForDestination = (
  destinationId: AccountCreateErrorDestinationId,
): AccountCreateErrorVariant => {
  switch (destinationId) {
    case ACCOUNT_CREATE_ERROR_DESTINATION.blocked:
      return 'blocked';
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
        return 'blocked';
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
    case 403:
    case 422:
      return 'blocked';
    case 400:
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

/**
 * Fields safe to log for a registration failure. The response body is omitted
 * because invalid-data errors can echo bank details.
 *
 * @param result - HTTP error or 200 fiat-address status.
 * @returns Status identifiers and `traceId` when MoonPay sent one.
 */
export const getAccountCreateFailureLogFields = (
  result: AccountCreateRegistrationResult,
): {
  httpStatus: number;
  fiatStatus?: FiatAddressStatus;
  traceId?: string;
} => {
  if (result.kind === 'fiat') {
    return { httpStatus: 200, fiatStatus: result.status };
  }

  return {
    httpStatus: result.status,
    ...(result.traceId ? { traceId: result.traceId } : {}),
  };
};

/**
 * Logs a registration result that maps to an error screen. Pending, success,
 * an existing account, and email verification are not logged. The payload is
 * only {@link getAccountCreateFailureLogFields}.
 *
 * @param result - HTTP error or 200 fiat-address status.
 * @returns The onboarding destination for that screen, or null when nothing is logged.
 */
export const logAccountCreateFailure = (
  result: AccountCreateRegistrationResult,
): AccountCreateErrorDestinationId | null => {
  const variant = getAccountCreateErrorVariant(result);
  if (!variant) {
    return null;
  }

  Logger.error(
    new Error('VBA account creation failed'),
    getAccountCreateFailureLogFields(result),
  );

  return ACCOUNT_CREATE_ERROR_DESTINATION[variant];
};
