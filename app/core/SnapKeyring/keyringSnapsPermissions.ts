/* eslint-disable no-console */
import { KeyringRpcMethod } from '@metamask/keyring-api';

/**
 * The origins of the Portfolio dapp.
 */
const PORTFOLIO_ORIGINS: string[] = [
  'https://portfolio.metamask.io',
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  'https://dev.portfolio.metamask.io',
  'https://stage.portfolio.metamask.io',
  'https://ramps-dev.portfolio.metamask.io',
  'https://portfolio-builds.metafi-dev.codefi.network',
  ///: END:ONLY_INCLUDE_IF
];

/**
 * List of keyring methods MetaMask can call.
 */
const METAMASK_ALLOWED_METHODS: string[] = [
  KeyringRpcMethod.ListAccounts,
  KeyringRpcMethod.GetAccount,
  KeyringRpcMethod.FilterAccountChains,
  KeyringRpcMethod.DeleteAccount,
  KeyringRpcMethod.ListRequests,
  KeyringRpcMethod.GetRequest,
  KeyringRpcMethod.SubmitRequest,
  KeyringRpcMethod.RejectRequest,
];

/**
 * List of keyring methods a dapp can call.
 * !NOTE: DO NOT INCLUDE `KeyringRpcMethod.SubmitRequest` IN THIS LIST.
 */
const WEBSITE_ALLOWED_METHODS: string[] = [
  KeyringRpcMethod.ListAccounts,
  KeyringRpcMethod.GetAccount,
  KeyringRpcMethod.CreateAccount,
  KeyringRpcMethod.FilterAccountChains,
  KeyringRpcMethod.UpdateAccount,
  KeyringRpcMethod.DeleteAccount,
  KeyringRpcMethod.ExportAccount,
  KeyringRpcMethod.ListRequests,
  KeyringRpcMethod.GetRequest,
  KeyringRpcMethod.ApproveRequest,
  KeyringRpcMethod.RejectRequest,
];

/**
 * List of keyring methods that Portfolio can call.
 */
const PORTFOLIO_ALLOWED_METHODS: string[] = [
  KeyringRpcMethod.ListAccounts,
  KeyringRpcMethod.GetAccount,
  KeyringRpcMethod.GetAccountBalances,
  KeyringRpcMethod.SubmitRequest,
];

/**
 * List of allowed protocols. On Flask, HTTP is also allowed for testing.
 */
const ALLOWED_PROTOCOLS: string[] = [
  'https:',
];

/**
 * Checks if the protocol of the origin is allowed.
 *
 * @param origin - The origin to check.
 * @returns `true` if the protocol of the origin is allowed, `false` otherwise.
 */
export function isProtocolAllowed(origin: string): boolean {
  try {
    const url = new URL(origin);
    return ALLOWED_PROTOCOLS.includes(url.protocol);
  } catch (error) {
    return false;
  }
}

/**
 * Builds a function that returns the list of keyring methods an origin can
 * call.
 * - Here is the equivalent function on the extension: https://github.com/MetaMask/metamask-extension/blob/develop/app/scripts/lib/snap-keyring/keyring-snaps-permissions.ts#L96
 * @param controller - Reference to the `SubjectMetadataController`.
 * @param origin - The origin itself.
 * @returns A function that returns the list of keyring methods an origin can
 * call.
 */
export function keyringSnapPermissionsBuilder(
  origin: string,
): () => string[] {
  return () => {
    if (origin === 'metamask') {
      return METAMASK_ALLOWED_METHODS;
    }

    if (PORTFOLIO_ORIGINS.includes(origin)) {
      return PORTFOLIO_ALLOWED_METHODS;
    }
    return isProtocolAllowed(origin) ? WEBSITE_ALLOWED_METHODS : [];
  };
}
