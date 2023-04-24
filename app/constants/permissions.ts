export const EndowmentPermissions = Object.freeze({
  'endowment:network-access': 'endowment:network-access',
  'endowment:long-running': 'endowment:long-running',
  'endowment:transaction-insight': 'endowment:transaction-insight',
  'endowment:cronjob': 'endowment:cronjob',
  'endowment:ethereum-provider': 'endowment:ethereum-provider',
  'endowment:rpc': 'endowment:rpc',
} as const);

export enum USER_INTENT {
  None,
  Create,
  CreateMultiple,
  Confirm,
  Cancel,
  Import,
  ConnectHW,
}
