import { TextElement } from '@metamask/snaps-sdk/jsx';
import {
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { mockTheme } from '../../../../util/theme';
import { text } from './text';

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
            variant: TextVariant.BodyMd,
            fontWeight: FontWeight.Regular,
            style: {
              textAlign: 'left',
            },
          },
        },
      ],
      props: {
        variant: TextVariant.BodyMd,
        color: undefined,
        fontWeight: FontWeight.Regular,
        style: {
          textAlign: 'left',
        },
      },
    });
  });

  it('should handle different text colors', () => {
    const colorMap: Record<
      NonNullable<TextElement['props']['color']>,
      string
    > = {
      default: TextColor.TextDefault,
      alternative: TextColor.TextAlternative,
      muted: TextColor.TextMuted,
      error: TextColor.ErrorDefault,
      success: TextColor.SuccessDefault,
      warning: TextColor.WarningDefault,
    };

    (
      Object.keys(colorMap) as NonNullable<TextElement['props']['color']>[]
    ).forEach((color) => {
      const el: TextElement = {
        type: 'Text',
        props: { color, children: ['Test'] },
        key: null,
      };

      const result = text({ element: el, ...defaultParams });
      expect(result.props?.color).toBe(colorMap[color]);
    });
  });

  it('should handle different font weights', () => {
    const weights = ['bold', 'medium', 'regular'] as const;

    const expectedWeights = {
      bold: FontWeight.Bold,
      medium: FontWeight.Medium,
      regular: FontWeight.Regular,
    };

    weights.forEach((weight) => {
      const el: TextElement = {
        type: 'Text',
        props: { fontWeight: weight, children: ['Test'] },
        key: null,
      };

      const result = text({ element: el, ...defaultParams });
      expect(result.props?.fontWeight).toBe(expectedWeights[weight]);
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
    expect(result.props?.variant).toBe(TextVariant.BodySm);
  });
});
