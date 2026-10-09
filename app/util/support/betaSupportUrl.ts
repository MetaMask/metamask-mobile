import { isBetaBuild } from '../environment';

export const getBetaSupportUrl = (): string =>
  isBetaBuild ? 'https://intercom.help/internal-beta-testing/en/' : '';
