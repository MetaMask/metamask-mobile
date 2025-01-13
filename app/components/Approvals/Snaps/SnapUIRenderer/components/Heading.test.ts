import { heading } from '../components/heading';

describe('heading UIComponentFactory', () => {
  it('should transform HeadingElement into SheetHeader format', () => {
    const mockHeadingElement = {
      type: 'heading',
      props: {
        children: 'Test Heading',
      },
    };

    const result = heading({ element: mockHeadingElement });

    expect(result).toEqual({
      element: 'SheetHeader',
      props: {
        title: 'Test Heading',
      },
    });
  });

  it('should handle empty children prop', () => {
    const mockHeadingElement = {
      type: 'heading',
      props: {
        children: '',
      },
    };

    const result = heading({ element: mockHeadingElement });

    expect(result).toEqual({
      element: 'SheetHeader',
      props: {
        title: '',
      },
    });
  });

  it('should handle complex children content', () => {
    const mockHeadingElement = {
      type: 'heading',
      props: {
        children: ['Multiple ', 'Text ', 'Nodes'],
      },
    };

    const result = heading({ element: mockHeadingElement });

    expect(result).toEqual({
      element: 'SheetHeader',
      props: {
        title: ['Multiple ', 'Text ', 'Nodes'],
      },
    });
  });
});
