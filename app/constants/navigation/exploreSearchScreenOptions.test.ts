import { getExploreSearchScreenOptions } from './exploreSearchScreenOptions';

const defaultOptions = {
  animation: 'ios_from_right' as const,
};

describe('getExploreSearchScreenOptions', () => {
  it('disables the stack animation for the homepage entry', () => {
    expect(getExploreSearchScreenOptions('home', defaultOptions)).toEqual({
      headerShown: false,
      animation: 'none',
    });
  });

  it('keeps the default stack animation for other entry points', () => {
    expect(getExploreSearchScreenOptions('deeplink', defaultOptions)).toEqual({
      headerShown: false,
      animation: 'ios_from_right',
    });
  });

  it('keeps the default stack animation when the entry point is missing', () => {
    expect(getExploreSearchScreenOptions(undefined, defaultOptions)).toEqual({
      headerShown: false,
      animation: 'ios_from_right',
    });
  });
});
