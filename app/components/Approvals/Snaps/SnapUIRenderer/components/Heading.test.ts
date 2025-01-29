import { HeadingElement } from '@metamask/snaps-sdk/jsx';
import { heading } from '../components/heading';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';

describe('heading UIComponentFactory', () => {
  it('should transform HeadingElement into Text format with default size', () => {
    const mockHeadingElement: HeadingElement = {
      type: 'Heading',
      key: 'mock-key',
      props: {
        children: 'Test Heading',
      },
    };

    const result = heading({
      element: mockHeadingElement,
      map: {},
      t: (key: string) => key,
    });

    expect(result).toEqual({
      element: 'Text',
      children: 'Test Heading',
      props: {
        variant: TextVariant.HeadingSM,
        numberOfLines: 0,
      },
    });
  });

  it('should handle empty children prop', () => {
    const mockHeadingElement = {
      type: 'Heading',
      props: {
        children: '',
      },
    };

    const result = heading({
      element: mockHeadingElement as HeadingElement,
      map: {},
      t: (key: string) => key,
    });

    expect(result).toEqual({
      element: 'Text',
      children: '',
      props: {
        variant: TextVariant.HeadingSM,
        numberOfLines: 0,
      },
    });
  });

  it('should handle complex children content', () => {
    const mockHeadingElement = {
      type: 'Heading',
      props: {
        children: ['Multiple ', 'Text ', 'Nodes'],
      },
    };

    const result = heading({
      element: mockHeadingElement as HeadingElement,
      map: {},
      t: (key: string) => key,
    });

    expect(result).toEqual({
      element: 'Text',
      children: ['Multiple ', 'Text ', 'Nodes'],
      props: {
        variant: TextVariant.HeadingSM,
        numberOfLines: 0,
      },
    });
  });

  it('should handle different heading sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    const expectedVariants = {
      sm: TextVariant.HeadingSM,
      md: TextVariant.HeadingMD,
      lg: TextVariant.HeadingLG,
    };

    sizes.forEach((size) => {
      const mockHeadingElement = {
        type: 'Heading',
        props: {
          children: 'Test',
          size,
        },
      };

      const result = heading({
        element: mockHeadingElement as HeadingElement,
        map: {},
        t: (key: string) => key,
      });

      expect(result).toEqual({
        element: 'Text',
        children: 'Test',
        props: {
          variant: expectedVariants[size],
          numberOfLines: 0,
        },
      });
    });
  });
});
