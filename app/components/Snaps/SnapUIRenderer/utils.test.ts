import { mapToTemplate } from './utils';
import { strings } from '../../../../locales/i18n';
import { JSXElement } from '@metamask/snaps-sdk/jsx';
import { mockTheme } from '../../../util/theme';

describe('SnapUIRenderer utils', () => {
  describe('mapToTemplate', () => {
    it('map basic text content', () => {
      const el: JSXElement = {
        type: 'Text',
        props: {
          children: 'Test Content',
        },
        key: null,
      };

      const result = mapToTemplate({
        map: {},
        element: el,
        useFooter: false,
        onCancel: jest.fn(),
        t: strings,
        theme: mockTheme,
      });

      expect(result).toMatchInlineSnapshot(`
        {
          "children": [
            {
              "children": "Test Content",
              "element": "Text",
              "props": {
                "color": "inherit",
              },
            },
          ],
          "element": "Text",
          "key": "87ada83862ef4cde3ca2a1f8cbfbbc38af6f971cb4d669224ab903ffc2c7d1bd_1",
          "props": {
            "color": "inherit",
            "fontWeight": "normal",
            "textAlign": "left",
            "variant": "sBodyMD",
          },
        }
      `);
    });
  });
});
