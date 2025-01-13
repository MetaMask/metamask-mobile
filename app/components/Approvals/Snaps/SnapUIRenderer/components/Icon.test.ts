import { heading } from '../components/icon';

describe('Icon UIComponentFactory', () => {
  it('should create correct element configuration with all props', () => {
    const mockElement = {
      props: {
        name: 'test-icon',
        color: 'blue',
        size: 24,
      },
    };

    const result = heading({ element: mockElement as any });

    expect(result).toEqual({
      element: 'Icon',
      props: {
        name: 'test-icon',
        color: 'blue',
        size: 24,
      },
    });
  });

  it('should handle minimal props', () => {
    const mockElement = {
      props: {
        name: 'test-icon',
      },
    };

    const result = heading({ element: mockElement as any });

    expect(result).toEqual({
      element: 'Icon',
      props: {
        name: 'test-icon',
        color: undefined,
        size: undefined,
      },
    });
  });
});
