import { HeadingElement } from '@metamask/snaps-sdk/jsx';
import { heading } from './heading';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import { FlexWrap } from '../../../UI/Box/box.types';
import { mockTheme } from '../../../../util/theme';

describe('heading UIComponentFactory', () => {
  it('transform HeadingElement into Text format with default size', () => {
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
      theme: mockTheme,
    });

    expect(result).toEqual({
      element: 'Text',
      children: 'Test Heading',
      props: {
        variant: TextVariant.HeadingSM,
        numberOfLines: 0,
        flexWrap: FlexWrap.Wrap,
      },
    });
  });

  it('handle empty children prop', () => {
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
      theme: mockTheme,
    });

    expect(result).toEqual({
      element: 'Text',
      children: '',
      props: {
        variant: TextVariant.HeadingSM,
        numberOfLines: 0,
        flexWrap: FlexWrap.Wrap,
      },
    });
  });

  it('handle complex children content', () => {
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
      theme: mockTheme,
    });

    expect(result).toEqual({
      element: 'Text',
      children: ['Multiple ', 'Text ', 'Nodes'],
      props: {
        variant: TextVariant.HeadingSM,
        numberOfLines: 0,
        flexWrap: FlexWrap.Wrap,
      },
    });
  });

  it('handle different heading sizes', () => {
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
        theme: mockTheme,
      });

      expect(result).toEqual({
        element: 'Text',
        children: 'Test',
        props: {
          flexWrap: FlexWrap.Wrap,
          variant: expectedVariants[size],
          numberOfLines: 0,
        },
      });
    });
  });
});
