import { heading } from '../components/icon';

describe('Icon UIComponentFactory', () => {
  const mockParams = {
    map: {},
    t: jest.fn(),
  };

  it('should create correct element configuration with all props', () => {
    const mockElement = {
      props: {
        name: 'test-icon',
        color: 'blue',
        size: 24,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = heading({ ...mockParams, element: mockElement as any });

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = heading({ ...mockParams, element: mockElement as any });

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
