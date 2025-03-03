import { banner } from './banner';
import { BannerElement } from '@metamask/snaps-sdk/jsx';
import { mockTheme } from '../../../../util/theme';

describe('banner component', () => {
  const defaultParams = {
    map: {},
    t: jest.fn(),
    theme: mockTheme,
  };

  const createTextElement = (
    textContent: string,
  ): BannerElement['props']['children'] => ({
    type: 'Text' as const,
    key: 'mock-key',
    props: { children: textContent },
  });

  it('should render banner with some props', () => {
    const el: BannerElement = {
      type: 'Banner',
      props: {
        title: 'Test Title',
        severity: 'info',
        children: createTextElement('Test content'),
      },
      key: null,
    };

    const result = banner({ element: el, ...defaultParams });

    expect(result).toEqual({
      element: 'SnapUIBanner',
      children: [
        {
          element: 'Text',
          key: 'mock-key',
          children: [
            {
              key: '4322bc9dfc78dd5fac77c48bc64efc877ae6265f8cc50c12a63fe3a62674e402_1',
              element: 'RNText',
              props: {
                color: 'inherit',
              },
              children: 'Test content',
            },
          ],
          props: {
            color: 'inherit',
            fontWeight: 'normal',
            textAlign: 'left',
            variant: 'sBodyMD',
          },
        },
      ],
      props: {
        severity: 'Info',
        title: 'Test Title',
      },
    });
  });

  it('should properly map danger to error severity prop', () => {
    const el: BannerElement = {
      type: 'Banner',
      props: {
        title: 'Test Title',
        severity: 'danger',
        children: createTextElement('Test content'),
      },
      key: null,
    };

    const result = banner({ element: el, ...defaultParams });

    expect(result).toEqual({
      element: 'SnapUIBanner',
      children: [
        {
          element: 'Text',
          key: 'mock-key',
          children: [
            {
              key: '4322bc9dfc78dd5fac77c48bc64efc877ae6265f8cc50c12a63fe3a62674e402_2',
              element: 'RNText',
              props: {
                color: 'inherit',
              },
              children: 'Test content',
            },
          ],
          props: {
            color: 'inherit',
            fontWeight: 'normal',
            textAlign: 'left',
            variant: 'sBodyMD',
          },
        },
      ],
      props: {
        severity: 'Error',
        title: 'Test Title',
      },
    });
  });
});
