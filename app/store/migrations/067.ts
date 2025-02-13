import { migration66 } from './066';

/**
 * Migration for ensuring that all internal accounts have the correct scopes
 * Re-uses logic from migration 66
 * We have to re-run 66 as 67 because the values for the scopes changed
 * and users who already had 66 ran would not have the updated scope values.
 * The migration 66 was initially injecting a CAIP-2 namespace (eip155 for EVM EOA) rather than a full scope (eip155:0).
 * We now require full scopes (namespace:chain-id) for all Internal Accounts.
 * See https://github.com/MetaMask/accounts/pull/165 for more details.
 */
export default function migrate(state: unknown) {
  return migration66(state, 67);
}
