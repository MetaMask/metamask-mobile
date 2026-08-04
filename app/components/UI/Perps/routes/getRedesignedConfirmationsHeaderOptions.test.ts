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

  it('hides the native stack header when showPerpsHeader is true (inline ConfirmationNavHeader)', () => {
    const options = getRedesignedConfirmationsHeaderOptions({
      showPerpsHeader: true,
    });

    // Full-screen confirms render HeaderStandard inline; stack header stays hidden.
    expect(options.headerShown).toBe(false);
    expect(options.headerBackVisible).toBe(false);
    expect(options.gestureEnabled).toBe(false);
    expect(options).not.toHaveProperty('presentation');
  });

  it('defaults to hiding the native stack header when no params provided', () => {
    const options = getRedesignedConfirmationsHeaderOptions();

    expect(options.headerShown).toBe(false);
  });
});
