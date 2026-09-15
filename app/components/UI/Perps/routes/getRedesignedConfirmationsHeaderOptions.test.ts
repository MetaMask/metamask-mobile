import { getRedesignedConfirmationsHeaderOptions } from './index';

describe('getRedesignedConfirmationsHeaderOptions', () => {
  it('returns push-style options without modal presentation when showPerpsHeader is false', () => {
    const options = getRedesignedConfirmationsHeaderOptions({
      showPerpsHeader: false,
    });

    expect(options.headerShown).toBe(false);
    expect(options.headerBackVisible).toBe(false);
    expect(options).not.toHaveProperty('presentation');
    expect(options.contentStyle).toBeUndefined();
  });

  it('returns header-visible options when showPerpsHeader is true', () => {
    const options = getRedesignedConfirmationsHeaderOptions({
      showPerpsHeader: true,
    });

    expect(options.headerShown).toBe(true);
    expect(options.headerBackVisible).toBe(false);
    expect(options).not.toHaveProperty('presentation');
  });

  it('uses transparent modal presentation for the bottom-sheet treatment', () => {
    const options = getRedesignedConfirmationsHeaderOptions({
      useBottomSheet: true,
      showPerpsHeader: false,
    });

    expect(options).toEqual(
      expect.objectContaining({
        presentation: 'transparentModal',
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: 'transparent' },
      }),
    );
  });

  it('defaults to showing perps header when no params provided', () => {
    const options = getRedesignedConfirmationsHeaderOptions();

    expect(options.headerShown).toBe(true);
  });
});
