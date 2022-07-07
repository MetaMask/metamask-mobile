export enum DeletionTaskStatus {
  pending = 'PENDING',
  staging = 'STAGING',
  started = 'STARTED',
  success = 'SUCCESS',
  failure = 'FAILURE',
  revoked = 'REVOKED',
  notFound = 'NOT_FOUND',
  unknown = 'UNKNOWN',
}

export enum ResponseStatus {
  ok = 'ok',
  error = 'error',
}
