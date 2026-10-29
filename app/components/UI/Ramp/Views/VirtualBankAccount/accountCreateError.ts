import Logger from '../../../../../util/Logger';

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

export type AccountCreateFailureFiatStatus = Extract<
  FiatAddressStatus,
  'AuthorizationFailed' | 'RegistrationFailed'
>;

export type AccountCreateHttpStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500;

const ACCOUNT_CREATE_HTTP_STATUSES: readonly number[] = [
  400, 401, 403, 404, 409, 422, 500,
];

const ERROR_VARIANTS_BY_HTTP_STATUS: Record<
  AccountCreateHttpStatus,
  AccountCreateErrorVariant | null
> = {
  400: 'details',
  401: 'generic',
  403: 'details',
  404: 'generic',
  409: null,
  422: 'details',
  500: 'generic',
};

export type AccountCreateRegistrationResult =
  | {
      kind: 'http';
      status: AccountCreateHttpStatus;
      traceId?: string;
    }
  | {
      kind: 'fiat';
      status: FiatAddressStatus;
    }
  | {
      kind: 'unknown';
    };

export class AccountCreateRegistrationError extends Error {
  readonly result: AccountCreateRegistrationResult;

  constructor(result: AccountCreateRegistrationResult) {
    super('VBA account creation failed');
    this.name = 'AccountCreateRegistrationError';
    this.result = result;
  }
}

const isFiatAddressStatus = (status: unknown): status is FiatAddressStatus =>
  typeof status === 'string' &&
  (FIAT_ADDRESS_STATUSES as readonly string[]).includes(status);

const isAccountCreateHttpStatus = (
  status: unknown,
): status is AccountCreateHttpStatus =>
  typeof status === 'number' && ACCOUNT_CREATE_HTTP_STATUSES.includes(status);

const getTraceId = (
  context: { traceId?: unknown } | undefined,
  error: unknown,
): string | undefined => {
  if (typeof context?.traceId === 'string') {
    return context.traceId;
  }
  if (!(error instanceof Error)) {
    return undefined;
  }

  const match = /"(?:traceId|trace_id)"\s*:\s*"([^"\\]{1,200})"/u.exec(
    error.message,
  );
  return match?.[1];
};

export const getAccountCreateResultFromResponse = (
  response: unknown,
): AccountCreateRegistrationResult | null => {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const status = (response as { status?: unknown }).status;
  return isFiatAddressStatus(status) ? { kind: 'fiat', status } : null;
};

export const getAccountCreateFiatFailureResult = (
  status: unknown,
): AccountCreateRegistrationResult | null =>
  status === 'AuthorizationFailed' || status === 'RegistrationFailed'
    ? { kind: 'fiat', status }
    : null;

export const getAccountCreateResultFromError = (
  error: unknown,
): AccountCreateRegistrationResult => {
  if (error instanceof AccountCreateRegistrationError) {
    return error.result;
  }

  const context =
    error && typeof error === 'object'
      ? (error as {
          httpStatus?: unknown;
          fiatStatus?: unknown;
          traceId?: unknown;
        })
      : undefined;
  if (context?.httpStatus === 200 && isFiatAddressStatus(context.fiatStatus)) {
    return { kind: 'fiat', status: context.fiatStatus };
  }

  const status = context?.httpStatus;
  if (!isAccountCreateHttpStatus(status)) {
    return { kind: 'unknown' };
  }

  const traceId = getTraceId(context, error);
  return {
    kind: 'http',
    status,
    ...(traceId ? { traceId } : {}),
  };
};

export const isAccountCreateErrorDestination = (
  destinationId: string,
): destinationId is AccountCreateErrorDestinationId =>
  destinationId === ACCOUNT_CREATE_ERROR_DESTINATION.details ||
  destinationId === ACCOUNT_CREATE_ERROR_DESTINATION.generic;

export const accountCreateErrorVariantForDestination = (
  destinationId: AccountCreateErrorDestinationId,
): AccountCreateErrorVariant =>
  destinationId === ACCOUNT_CREATE_ERROR_DESTINATION.details
    ? 'details'
    : 'generic';

export const getAccountCreateErrorVariant = (
  result: AccountCreateRegistrationResult,
): AccountCreateErrorVariant | null => {
  if (result.kind === 'unknown') {
    return 'generic';
  }

  if (result.kind === 'fiat') {
    return result.status === 'AuthorizationFailed' ||
      result.status === 'RegistrationFailed'
      ? 'details'
      : null;
  }

  return ERROR_VARIANTS_BY_HTTP_STATUS[result.status];
};

export interface AccountCreateFailureFields {
  httpStatus: number;
  fiatStatus?: FiatAddressStatus;
  traceId?: string;
}

export type AccountCreateErrorPrimaryAction = 'contactSupport' | 'retry';

export const getAccountCreateErrorPrimaryAction = (
  fields?: AccountCreateFailureFields,
): AccountCreateErrorPrimaryAction =>
  fields?.httpStatus === 500 ? 'retry' : 'contactSupport';

const SUPPORT_PARAM_HTTP_STATUS = 'http_status';
const SUPPORT_PARAM_FIAT_STATUS = 'fiat_status';
const SUPPORT_PARAM_TRACE_ID = 'trace_id';

/** Returns only support-safe failure fields; response bodies stay excluded. */
export const getAccountCreateFailureLogFields = (
  result: AccountCreateRegistrationResult,
): AccountCreateFailureFields | undefined => {
  if (result.kind === 'unknown') {
    return undefined;
  }

  if (result.kind === 'fiat') {
    return { httpStatus: 200, fiatStatus: result.status };
  }

  return {
    httpStatus: result.status,
    ...(result.traceId ? { traceId: result.traceId } : {}),
  };
};

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

/** Appends support-safe registration identifiers to the help-center URL. */
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
