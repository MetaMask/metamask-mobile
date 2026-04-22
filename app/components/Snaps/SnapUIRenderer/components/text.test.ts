import { text } from './text';
import {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text/Text.types';
import { TextElement } from '@metamask/snaps-sdk/jsx';
import { mockTheme } from '../../../../util/theme';

describe('text component', () => {
  const defaultParams = {
    map: {},
    useFooter: false,
    onCancel: jest.fn(),
    t: jest.fn(),
    theme: mockTheme,
  };

  it('should render text with default props', () => {
    const el: TextElement = {
      type: 'Text',
      props: {
        children: ['Hello World'],
      },
      key: null,
    };

    const result = text({ element: el, ...defaultParams });

    expect(result).toEqual({
      element: 'Text',
      children: [
        {
          key: expect.any(String),
          element: 'Text',
          children: 'Hello World',
          props: {
            color: undefined,
            variant: 'sBodyMD',
            style: {
              fontWeight: '400',
              textAlign: 'left',
            },
          },
        },
      ],
      props: {
        variant: TextVariant.BodyMD,
        color: undefined,
        style: {
          fontWeight: '400',
          textAlign: 'left',
        },
      },
    });
  });

  it('should handle different text colors', () => {
    const colors: TextElement['props']['color'][] = [
      'default',
      'alternative',
      'muted',
      'error',
      'success',
      'warning',
    ];

    colors.forEach((color) => {
      if (!color) return;

      const el: TextElement = {
        type: 'Text',
        props: { color, children: ['Test'] },
        key: null,
      };

      const result = text({ element: el, ...defaultParams });
      const capitalizedColor = color.charAt(0).toUpperCase() + color.slice(1);
      expect(result.props?.color).toBe(
        TextColor[capitalizedColor as keyof typeof TextColor],
      );
    });
  });

  it('should handle different font weights', () => {
    const weights = ['bold', 'medium', 'regular'] as const;

    const expectedWeights = {
      bold: '700',
      medium: '500',
      regular: '400',
    };

    weights.forEach((weight) => {
      const el: TextElement = {
        type: 'Text',
        props: { fontWeight: weight, children: ['Test'] },
        key: null,
      };

      const result = text({ element: el, ...defaultParams });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.props as any)?.style?.fontWeight).toBe(
        expectedWeights[weight],
      );
    });
  });

  it('should handle different text alignments', () => {
    const alignments = ['start', 'center', 'end'] as const;

    const expectedAlignments = {
      start: 'left',
      center: 'center',
      end: 'right',
    };

    alignments.forEach((alignment) => {
      const el: TextElement = {
        type: 'Text',
        props: { alignment, children: ['Test'] },
        key: null,
      };

      const result = text({ element: el, ...defaultParams });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.props as any)?.style?.textAlign).toBe(
        expectedAlignments[alignment],
      );
    });
  });

  it('should handle different text sizes', () => {
    const el: TextElement = {
      type: 'Text',
      props: { size: 'sm', children: ['Test'] },
      key: null,
    };

    const result = text({ element: el, ...defaultParams });
    expect(result.props?.variant).toBe(TextVariant.BodySM);
  });
});
