import { HeadingElement } from '@metamask/snaps-sdk/jsx';
import { heading } from '../components/heading';

describe('heading UIComponentFactory', () => {
  it('should transform HeadingElement into SheetHeader format', () => {
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
      element: 'SheetHeader',
      props: {
        title: 'Test Heading',
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
      element: 'SheetHeader',
      props: {
        title: '',
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
      element: 'SheetHeader',
      props: {
        title: ['Multiple ', 'Text ', 'Nodes'],
      },
    });
  });
});
