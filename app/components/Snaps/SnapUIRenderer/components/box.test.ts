import { BoxElement } from '@metamask/snaps-sdk/jsx';
import { box } from './box';
import { FlexDirection } from '../utils';
import { TextColor } from '../../../../component-library/components/Texts/Text';

describe('box UIComponentFactory', () => {
  const mockParams = {
    map: {},
    t: (key: string) => key,
  };

  const createTextElement = (text: string) => ({
    type: 'Text',
    key: 'mock-key',
    props: { children: text },
  });

  it('should transform BoxElement with default props', () => {
    const mockElement: BoxElement = {
      type: 'Box',
      key: 'mock-key',
      props: {
        children: [createTextElement('Test content')],
      },
    };

    const result = box({
      element: mockElement,
      ...mockParams,
    });

    expect(result).toEqual({
      element: 'Box',
      children: [
        {
          element: 'Text',
          key: 'mock-key',
          children: ['Test content'],
          props: {
            color: 'Default',
            fontWeight: 'normal',
            textAlign: 'left',
            variant: 'sBodyMD',
          },
        },
      ],
      props: {
        flexDirection: FlexDirection.Column,
        justifyContent: 'flex-start',
        color: TextColor.Default,
        alignItems: 'center',
      },
    });
  });

  it('should handle horizontal direction', () => {
    const mockElement: BoxElement = {
      type: 'Box',
      key: 'mock-key',
      props: {
        direction: 'horizontal',
        children: [createTextElement('Test content')],
      },
    };

    const result = box({
      element: mockElement,
      ...mockParams,
    });

    expect(result.props?.flexDirection).toBe(FlexDirection.Row);
  });

  it('should handle different alignments', () => {
    const alignments = [
      'center',
      'end',
      'space-between',
      'space-around',
    ] as const;

    alignments.forEach((alignment) => {
      const mockElement: BoxElement = {
        type: 'Box',
        key: 'mock-key',
        props: {
          alignment,
          children: [createTextElement('Test content')],
        },
      };

      const result = box({
        element: mockElement,
        ...mockParams,
      });

      const expected = {
        center: 'center',
        end: 'flex-end',
        'space-between': 'space-between',
        'space-around': 'space-around',
      }[alignment];

      expect(result.props?.justifyContent).toBe(expected);
    });
  });

  it('should pass through additional BoxProps', () => {
    const mockElement: BoxElement = {
      type: 'Box',
      key: 'mock-key',
      props: {
        children: [createTextElement('Test content')],
        direction: 'horizontal',
        alignment: 'center',
      },
    };

    const result = box({
      element: mockElement,
      ...mockParams,
    });

    expect(result.props).toEqual(
      expect.objectContaining({
        flexDirection: FlexDirection.Row,
        justifyContent: 'center',
      }),
    );
  });
});
