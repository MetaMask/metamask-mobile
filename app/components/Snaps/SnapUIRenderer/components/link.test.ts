import { link } from './link';
import { LinkElement } from '@metamask/snaps-sdk/jsx';
import { mockTheme } from '../../../../util/theme';

describe('link component', () => {
  const defaultParams = {
    map: {},
    t: jest.fn(),
    theme: mockTheme,
  };

  it('should return the correct element structure with href', () => {
    const linkElement: LinkElement = {
      type: 'Link',
      props: {
        href: 'https://metamask.io',
        children: ['link'],
      },
      key: null,
    };

    const result = link({ element: linkElement, ...defaultParams });

    expect(result).toEqual({
      element: 'SnapUILink',
      children: [
        {
          element: 'Text',
          children: 'link',
          key: expect.any(String),
          props: {
            color: '#4459ff',
            style: {
              fontWeight: undefined,
              textAlign: undefined,
            },
          },
        },
      ],
      props: {
        href: 'https://metamask.io',
      },
    });
  });
});
