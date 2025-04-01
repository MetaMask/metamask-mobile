import { Text, SnapElement, TooltipProps } from '@metamask/snaps-sdk/jsx';
import { tooltip } from './tooltip';
import { mockTheme } from '../../../../util/theme';

describe('tooltip component', () => {
  const defaultParams = {
    map: {},
    useFooter: false,
    onCancel: jest.fn(),
    t: jest.fn(),
    theme: mockTheme,
  };

  it('should render tooltip with string content', () => {
    const e = {
      type: 'Tooltip' as const,
      props: {
        content: 'Tooltip content',
        children: [Text({ children: 'Hover me' })],
      },
      key: null,
    };

    const result = tooltip({
      element: e as unknown as SnapElement<TooltipProps, 'Tooltip'>,
      ...defaultParams,
    });

    expect(result).toEqual({
      element: 'SnapUITooltip',
      children: [
        {
          element: 'Text',
          children: [
            {
              element: 'RNText',
              children: 'Hover me',
              props: {
                color: undefined,
              },
              key: expect.any(String),
            },
          ],
          props: {
            color: undefined,
            fontWeight: 'normal',
            textAlign: 'left',
            variant: 'sBodyMD',
          },
          key: expect.any(String),
        },
      ],
      propComponents: {
        content: {
          element: 'Text',
          children: [
            {
              element: 'RNText',
              children: 'Tooltip content',
              props: {
                color: undefined,
              },
              key: expect.any(String),
            },
          ],
          props: {
            color: undefined,
            fontWeight: 'normal',
            textAlign: 'left',
            variant: 'sBodyMD',
          },
          key: expect.any(String),
        },
      },
    });
  });

  it('should render tooltip with complex content', () => {
    const e = {
      type: 'Tooltip' as const,
      props: {
        content: Text({ children: 'Complex content' }),
        children: [Text({ children: 'Hover me' })],
      },
      key: null,
    };

    const result = tooltip({
      element: e as unknown as SnapElement<TooltipProps, 'Tooltip'>,
      ...defaultParams,
    });

    expect(result).toEqual({
      element: 'SnapUITooltip',
      children: [
        {
          element: 'Text',
          children: [
            {
              element: 'RNText',
              children: 'Hover me',
              props: {
                color: undefined,
              },
              key: expect.any(String),
            },
          ],
          props: {
            color: undefined,
            fontWeight: 'normal',
            textAlign: 'left',
            variant: 'sBodyMD',
          },
          key: expect.any(String),
        },
      ],
      propComponents: {
        content: {
          element: 'Text',
          children: [
            {
              element: 'RNText',
              children: 'Complex content',
              props: {
                color: undefined,
              },
              key: expect.any(String),
            },
          ],
          props: {
            color: undefined,
            fontWeight: 'normal',
            textAlign: 'left',
            variant: 'sBodyMD',
          },
          key: expect.any(String),
        },
      },
    });
  });

  it('should handle nested children', () => {
    const e = {
      type: 'Tooltip' as const,
      props: {
        content: 'Tooltip content',
        children: [Text({ children: 'Nested text' })],
      },
      key: null,
    };

    const result = tooltip({
      element: e as unknown as SnapElement<TooltipProps, 'Tooltip'>,
      ...defaultParams,
    });

    expect(result).toEqual({
      element: 'SnapUITooltip',
      children: [
        {
          element: 'Text',
          children: [
            {
              element: 'RNText',
              children: 'Nested text',
              props: {
                color: undefined,
              },
              key: expect.any(String),
            },
          ],
          props: {
            color: undefined,
            fontWeight: 'normal',
            textAlign: 'left',
            variant: 'sBodyMD',
          },
          key: expect.any(String),
        },
      ],
      propComponents: {
        content: {
          element: 'Text',
          children: [
            {
              element: 'RNText',
              children: 'Tooltip content',
              props: {
                color: undefined,
              },
              key: expect.any(String),
            },
          ],
          props: {
            color: undefined,
            fontWeight: 'normal',
            textAlign: 'left',
            variant: 'sBodyMD',
          },
          key: expect.any(String),
        },
      },
    });
  });
});
