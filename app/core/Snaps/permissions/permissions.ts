///: BEGIN:ONLY_INCLUDE_IF(snaps)
// TODO: Figure out which permissions should be disabled at this point
export const ExcludedSnapPermissions = Object.freeze([]);
export const ExcludedSnapEndowments = Object.freeze([]);

export const EndowmentPermissions = Object.freeze({
  'endowment:network-access': 'endowment:network-access',
  'endowment:transaction-insight': 'endowment:transaction-insight',
  'endowment:cronjob': 'endowment:cronjob',
  'endowment:ethereum-provider': 'endowment:ethereum-provider',
  'endowment:rpc': 'endowment:rpc',
} as const);
///: END:ONLY_INCLUDE_IF
