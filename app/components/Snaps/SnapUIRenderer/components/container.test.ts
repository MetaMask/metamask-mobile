import { BoxElement } from '@metamask/snaps-sdk/jsx';
import { container } from './container';
import { mapToTemplate } from '../utils';
import { mockTheme } from '../../../../util/theme';

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

  it('render basic container with single child', () => {
    const mockElement = createMockElement([
      { type: 'text', props: {}, children: ['Hello'] },
    ]);

    const result = container({
      element: mockElement,
      useFooter: false,
      t: mockT,
      map: {},
      theme: mockTheme,
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "children": {
              "children": [
                "Hello",
              ],
              "element": "text",
              "props": {
                "style": {
                  "gap": 16,
                  "margin": 16,
                },
              },
            },
            "element": "ScrollView",
            "key": "default-scrollview",
            "props": {
              "style": {
                "marginBottom": 0,
              },
            },
          },
        ],
        "element": "Box",
        "props": {
          "style": {
            "flexDirection": "column",
            "flexGrow": 1,
          },
        },
      }
    `);
  });

  it('add footer button when useFooter is true and onCancel is provided', () => {
    const mockElement = createMockElement([]);
    const mockOnCancel = jest.fn();

    const result = container({
      element: mockElement,
      useFooter: true,
      onCancel: mockOnCancel,
      t: mockT,
      map: {},
      theme: mockTheme,
    });

    expect(Array.isArray(result.children)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.children as any[])[0]).toMatchInlineSnapshot(`
      {
        "children": {
          "children": {
            "children": "navigation.close",
            "element": "SnapUIFooterButton",
            "key": "default-button",
            "props": {
              "isSnapAction": false,
              "onCancel": [MockFunction],
            },
          },
          "element": "Box",
          "key": "default-footer",
          "props": {
            "flexDirection": "row",
            "gap": 16,
            "padding": 16,
            "style": {
              "alignItems": "center",
              "bottom": 0,
              "gap": 16,
              "height": 80,
              "justifyContent": "space-evenly",
              "margin": 16,
              "paddingVertical": 16,
              "position": "absolute",
              "width": "100%",
            },
          },
        },
        "element": "ScrollView",
        "key": "default-scrollview",
        "props": {
          "style": {
            "marginBottom": 0,
          },
        },
      }
    `);
  });
});
