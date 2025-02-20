import { text } from './text';
import {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text/Text.types';
import { TextElement } from '@metamask/snaps-sdk/jsx';

describe('text component', () => {
  const defaultParams = {
    map: {},
    useFooter: false,
    onCancel: jest.fn(),
    t: jest.fn(),
  };

  it('should render text with default props', () => {
    const element: TextElement = {
      type: 'Text',
      props: {
        children: ['Hello World'],
      },
      key: null,
    };

    const result = text({ element, ...defaultParams });

    expect(result).toEqual({
      element: 'Text',
      children: ['Hello World'],
      props: {
        variant: TextVariant.BodyMD,
        fontWeight: 'normal',
        color: TextColor.Default,
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
      const element: TextElement = {
        type: 'Text',
        props: { color, children: ['Test'] },
        key: null,
      };

      const result = text({ element, ...defaultParams });
      expect(result.props?.color).toBe(
        TextColor[
          (color!.charAt(0).toUpperCase() +
            color!.slice(1)) as keyof typeof TextColor
        ],
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
      const element: TextElement = {
        type: 'Text',
        props: { fontWeight: weight, children: ['Test'] },
        key: null,
      };

      const result = text({ element, ...defaultParams });
      expect(result.props?.fontWeight).toBe(expectedWeights[weight!]);
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
      const element: TextElement = {
        type: 'Text',
        props: { alignment, children: ['Test'] },
        key: null,
      };

      const result = text({ element, ...defaultParams });
      expect(result.props?.textAlign).toBe(expectedAlignments[alignment!]);
    });
  });

  it('should handle different text sizes', () => {
    const element: TextElement = {
      type: 'Text',
      props: { size: 'sm', children: ['Test'] },
      key: null,
    };

    const result = text({ element, ...defaultParams });
    expect(result.props?.variant).toBe(TextVariant.BodySM);
  });
});
