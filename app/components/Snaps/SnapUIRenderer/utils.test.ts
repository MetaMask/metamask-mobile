import {
  mapSnapBorderRadiusToExtensionBorderRadius,
  mapToTemplate,
} from './utils';
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
              "element": "RNText",
              "key": "87ada83862ef4cde3ca2a1f8cbfbbc38af6f971cb4d669224ab903ffc2c7d1bd_2",
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
  describe('mapSnapBorderRadiusToExtensionBorderRadius', () => {
    it('should correctly map all border radius values', () => {
      expect(mapSnapBorderRadiusToExtensionBorderRadius('none')).toBe(0);
      expect(mapSnapBorderRadiusToExtensionBorderRadius('medium')).toBe(6);
      expect(mapSnapBorderRadiusToExtensionBorderRadius('full')).toBe(9999);
      expect(mapSnapBorderRadiusToExtensionBorderRadius(undefined)).toBe(0);
      expect(mapSnapBorderRadiusToExtensionBorderRadius('invalid-value')).toBe(
        0,
      );
    });
  });
});
