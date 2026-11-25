import { strings } from '../../../../../locales/i18n';
import { getPerpsHomeScreenOptions } from './index';

describe('getPerpsHomeScreenOptions', () => {
  it('replaces a market screen with a backward transition', () => {
    const options = getPerpsHomeScreenOptions();

    expect(options.animationTypeForReplace).toBe('pop');
  });

  it('keeps Perps home headerless with its markets title', () => {
    const options = getPerpsHomeScreenOptions();

    expect(options.headerShown).toBe(false);
    expect(options.title).toBe(strings('perps.markets.title'));
  });
});
