import { BoxElement } from '@metamask/snaps-sdk/jsx';
import { container } from '../components/container';
import { mapToTemplate } from '../utils';

// First, properly mock the utils module
jest.mock('../utils', () => ({
  mapToTemplate: jest.fn(),
}));

describe('container', () => {
  const mockT = (key: string) => key;

  // Add beforeEach to set up the mock implementation for each test
  beforeEach(() => {
    (mapToTemplate as jest.Mock).mockReset();
    (mapToTemplate as jest.Mock).mockImplementation((e) => ({
      element: e.element.type,
      props: e.element.props || {},
      children: e.element.children || [],
    }));
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createMockElement = (children: any[] = []): BoxElement => ({
    type: 'Box',
    props: {
      children,
    },
    key: 'mock-key',
  });

  it('should render basic container with single child', () => {
    const mockElement = createMockElement([
      { type: 'text', props: {}, children: ['Hello'] },
    ]);

    const result = container({
      element: mockElement,
      useFooter: false,
      t: mockT,
      map: {},
    });

    expect(result).toEqual({
      element: 'View',
      children: [
        {
          element: 'text',
          props: {},
          children: ['Hello'],
        },
      ],
      props: {
        style: {
          flex: 1,
          flexDirection: 'column',
        },
      },
    });
  });

  it('should add footer button when useFooter is true and onCancel is provided', () => {
    const mockElement = createMockElement([]);
    const mockOnCancel = jest.fn();

    const result = container({
      element: mockElement,
      useFooter: true,
      onCancel: mockOnCancel,
      t: mockT,
      map: {},
    });

    expect(Array.isArray(result.children)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.children as any[])[0]).toEqual({
      element: '',
      props: {
        style: { alignItems: 'center' },
      },
      children: {
        element: 'SnapUIFooterButton',
        key: 'default-button',
        props: {
          onCancel: mockOnCancel,
          isSnapAction: false,
        },
        children: 'close',
      },
    });
  });
});
