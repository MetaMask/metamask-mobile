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
          key: 'ac37e9a8c31a35346c51f0f9058d2e2f0aecde724a0d7192561af5625000f3d1_1',
          element: 'Text',
          children: 'Hello World',
          props: { color: undefined, variant: 'sBodyMD' },
        },
      ],
      props: {
        variant: TextVariant.BodyMD,
        fontWeight: 'normal',
        color: undefined,
        textAlign: 'left',
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
    const weights: TextElement['props']['fontWeight'][] = [
      'bold',
      'medium',
      'regular',
    ];
    const expectedWeights = {
      bold: 'bold',
      medium: 'medium',
      regular: 'normal',
    };

    weights.forEach((weight) => {
      if (!weight) return;
      const el: TextElement = {
        type: 'Text',
        props: { fontWeight: weight, children: ['Test'] },
        key: null,
      };

      const result = text({ element: el, ...defaultParams });
      if (weight in expectedWeights) {
        expect(result.props?.fontWeight).toBe(expectedWeights[weight]);
      }
    });
  });

  it('should handle different text alignments', () => {
    const alignments: TextElement['props']['alignment'][] = [
      'start',
      'center',
      'end',
    ];
    const expectedAlignments = {
      start: 'left',
      center: 'center',
      end: 'right',
    };

    alignments.forEach((alignment) => {
      if (!alignment) return;
      const el: TextElement = {
        type: 'Text',
        props: { alignment, children: ['Test'] },
        key: null,
      };

      const result = text({ element: el, ...defaultParams });
      if (alignment in expectedAlignments) {
        expect(result.props?.textAlign).toBe(expectedAlignments[alignment]);
      }
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
