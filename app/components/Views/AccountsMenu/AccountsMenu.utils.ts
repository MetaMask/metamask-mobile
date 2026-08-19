import { isBetaBuild } from '../../../util/environment';

// Isolated as its own function (rather than inlined at each call site) so
// tests can mock this module to exercise both the beta and non-beta branches.
export const getBetaSupportUrl = (): string =>
  isBetaBuild ? 'https://intercom.help/internal-beta-testing/en/' : '';
