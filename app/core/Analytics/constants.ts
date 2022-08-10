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

export enum States {
  enabled = 'ENABLED',
  disabled = 'DISABLED',
}

export const METAMETRICS_ANONYMOUS_ID = '0x0000000000000000';

export const SEGMENT_REGULATIONS_ENDPOINT =
  'https://platform.segmentapis.com/v1beta/workspaces/myworkspace/regulations';
