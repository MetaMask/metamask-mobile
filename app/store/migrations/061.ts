import { hasProperty } from '@metamask/utils';
import { ensureValidState } from './util';

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 61)) {
    return state;
  }
  if (hasProperty(state, 'featureFlags')) {
    delete state.featureFlags;
  }
  return state;
}
