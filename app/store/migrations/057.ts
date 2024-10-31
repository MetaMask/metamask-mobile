import { migration52 } from './052';

/**
 * Migration for ensuring that selectedAccount on the AccountsController is defined
 * Re-uses logic from migration 52
 */
export default function migrate(state: unknown) {
  return migration52(state, 57);
}
