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
              element: 'Text',
              props: {
                color: undefined,
              },
              children: 'Test content',
            },
          ],
          props: {
            color: undefined,
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
              element: 'Text',
              props: {
                color: undefined,
              },
              children: 'Test content',
            },
          ],
          props: {
            color: undefined,
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

  it('removes empty title', () => {
    const el: BannerElement = {
      type: 'Banner',
      props: {
        title: '',
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
              key: '4322bc9dfc78dd5fac77c48bc64efc877ae6265f8cc50c12a63fe3a62674e402_3',
              element: 'Text',
              props: {
                color: undefined,
              },
              children: 'Test content',
            },
          ],
          props: {
            color: undefined,
            fontWeight: 'normal',
            textAlign: 'left',
            variant: 'sBodyMD',
          },
        },
      ],
      props: {
        severity: 'Info',
        title: null,
      },
    });
  });
});
