import { spinner } from './spinner';
import { SpinnerElement } from '@metamask/snaps-sdk/jsx';
import { mockTheme } from '../../../../util/theme';

describe('spinner component', () => {
  const defaultParams = {
    map: {},
    t: jest.fn(),
    theme: mockTheme,
  };

  it('should return the correct element structure', () => {
    const spinnerElement: SpinnerElement = {
      type: 'Spinner',
      props: {},
      key: null,
    };

    const result = spinner({ element: spinnerElement, ...defaultParams });

    expect(result).toEqual({
      element: 'SnapUISpinner',
    });
  });
});
