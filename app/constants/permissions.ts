/* eslint-disable import/prefer-default-export */
///: BEGIN:ONLY_INCLUDE_IF(snaps)
export const EndowmentPermissions = Object.freeze({
  'endowment:network-access': 'endowment:network-access',
  'endowment:transaction-insight': 'endowment:transaction-insight',
  'endowment:cronjob': 'endowment:cronjob',
  'endowment:ethereum-provider': 'endowment:ethereum-provider',
  'endowment:rpc': 'endowment:rpc',
} as const);
///: END:ONLY_INCLUDE_IF

export enum USER_INTENT {
  None,
  Create,
  CreateMultiple,
  Confirm,
  Cancel,
  Import,
  ConnectHW,
}
