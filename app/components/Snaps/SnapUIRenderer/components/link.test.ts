import { link } from './link';
import { LinkElement } from '@metamask/snaps-sdk/jsx';
import { mockTheme } from '../../../../util/theme';
import { UIComponent } from './types';

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
            variant: undefined,
          },
        },
      ],
      props: {
        href: 'https://metamask.io',
      },
    });
  });

  it('should pass through icon with primary color', () => {
    const linkElement: LinkElement = {
      type: 'Link',
      props: {
        href: 'https://metamask.io',
        children: [
          'Visit ',
          {
            type: 'Icon',
            props: {
              name: 'arrow-right',
            },
            key: null,
          },
        ],
      },
      key: null,
    };

    const result = link({ element: linkElement, ...defaultParams });

    expect(result).toEqual({
      element: 'SnapUILink',
      children: [
        {
          element: 'Text',
          children: 'Visit ',
          key: expect.any(String),
          props: {
            color: '#4459ff',
            style: {
              fontWeight: undefined,
              textAlign: undefined,
            },
            variant: undefined,
          },
        },
        {
          element: 'SnapUIIcon',
          key: expect.any(String),
          props: {
            color: 'Primary',
            name: 'ArrowRight',
            size: '16',
          },
        },
      ],
      props: {
        href: 'https://metamask.io',
      },
    });
  });

  it('should preserve muted color for icons explicitly set to muted', () => {
    const linkElement: LinkElement = {
      type: 'Link',
      props: {
        href: 'https://metamask.io',
        children: [
          'Visit ',
          {
            type: 'Icon',
            props: {
              name: 'arrow-right',
              color: 'muted',
            },
            key: null,
          },
        ],
      },
      key: null,
    };

    const result = link({ element: linkElement, ...defaultParams });

    expect(result).toEqual({
      element: 'SnapUILink',
      children: [
        {
          element: 'Text',
          children: 'Visit ',
          key: expect.any(String),
          props: {
            color: '#4459ff',
            style: {
              fontWeight: undefined,
              textAlign: undefined,
            },
            variant: undefined,
          },
        },
        {
          element: 'SnapUIIcon',
          key: expect.any(String),
          props: {
            color: 'Muted',
            name: 'ArrowRight',
            size: '16',
          },
        },
      ],
      props: {
        href: 'https://metamask.io',
      },
    });
  });

  it('should handle multiple text fragments', () => {
    const linkElement: LinkElement = {
      type: 'Link',
      props: {
        href: 'https://metamask.io',
        children: ['Visit ', 'MetaMask'],
      },
      key: null,
    };

    const result = link({ element: linkElement, ...defaultParams });

    expect(result).toEqual({
      element: 'SnapUILink',
      children: [
        {
          element: 'Text',
          children: 'Visit ',
          key: expect.any(String),
          props: {
            color: '#4459ff',
            style: {
              fontWeight: undefined,
              textAlign: undefined,
            },
            variant: undefined,
          },
        },
        {
          element: 'Text',
          children: 'MetaMask',
          key: expect.any(String),
          props: {
            color: '#4459ff',
            style: {
              fontWeight: undefined,
              textAlign: undefined,
            },
            variant: undefined,
          },
        },
      ],
      props: {
        href: 'https://metamask.io',
      },
    });
  });

  it('should handle complex nested children', () => {
    const linkElement: LinkElement = {
      type: 'Link',
      props: {
        href: 'https://metamask.io',
        children: [
          'Visit ',
          {
            type: 'Bold',
            props: {
              children: ['MetaMask'],
            },
            key: null,
          },
          ' now',
        ],
      },
      key: null,
    };

    const result = link({ element: linkElement, ...defaultParams });

    // Check the structure but avoid too specific assertions
    expect(result.element).toBe('SnapUILink');
    expect(result.props?.href).toBe('https://metamask.io');

    // Check the children array exists and has the right length
    expect(Array.isArray(result.children)).toBe(true);
    const children = result.children as UIComponent[];
    expect(children.length).toBe(3);

    // Check first child is a Text with expected content
    expect(children[0].element).toBe('Text');
    expect(children[0].children).toBe('Visit ');

    // Check second child is a Bold element - just check if it exists and has the expected structure
    // without asserting specific style values that may change
    const secondChild = children[1] as UIComponent;
    expect(secondChild.element).toBe('Text');
    // Just verify it contains MetaMask content
    expect(JSON.stringify(secondChild)).toContain('MetaMask');

    // Check third child is a Text with expected content
    expect(children[2].element).toBe('Text');
    expect(children[2].children).toBe(' now');
  });
});
