///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
// TODO: Figure out which permissions should be disabled at this point
export const ExcludedSnapPermissions = Object.freeze({
  eth_accounts:
  'eth_accounts is disabled. For more information please see https://github.com/MetaMask/snaps/issues/990.',
});
export const ExcludedSnapEndowments = Object.freeze({});

export const EndowmentPermissions = Object.freeze({
  'endowment:network-access': 'endowment:network-access',
  'endowment:transaction-insight': 'endowment:transaction-insight',
  'endowment:cronjob': 'endowment:cronjob',
  'endowment:ethereum-provider': 'endowment:ethereum-provider',
  'endowment:rpc': 'endowment:rpc',
  'endowment:webassembly': 'endowment:webassembly',
  'endowment:lifecycle-hooks': 'endowment:lifecycle-hooks',
  'endowment:page-home': 'endowment:page-home',
  'endowment:signature-insight': 'endowment:signature-insight',
  'endowment:name-lookup': 'endowment:name-lookup',
  'endowment:keyring': 'endowment:keyring',
} as const);
///: END:ONLY_INCLUDE_IF
