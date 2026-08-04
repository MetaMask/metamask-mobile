import { getRedesignedConfirmationsHeaderOptions } from './index';

describe('getRedesignedConfirmationsHeaderOptions', () => {
  it('hides the stack header when showPerpsHeader is false', () => {
    const options = getRedesignedConfirmationsHeaderOptions({
      showPerpsHeader: false,
    });

    expect(options.headerShown).toBe(false);
  });

  it('hides the stack header when showPerpsHeader is true', () => {
    const options = getRedesignedConfirmationsHeaderOptions({
      showPerpsHeader: true,
    });

    expect(options.headerShown).toBe(false);
  });

  it('hides the stack header by default', () => {
    const options = getRedesignedConfirmationsHeaderOptions();

    expect(options.headerShown).toBe(false);
  });
});
