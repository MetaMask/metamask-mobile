import { migration66 } from './066';

/**
 * Migration for ensuring that all internal accounts have the correct scopes
 * Re-uses logic from migration 66
 * We have to re-run 66 as 67 because the values for the scopes changed
 * and users who already had 66 ran would not have the updated scope values
 */
export default function migrate(state: unknown) {
  return migration66(state, 67);
}
