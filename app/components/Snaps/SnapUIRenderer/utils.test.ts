import { mapToTemplate } from './utils';
import { strings } from '../../../../locales/i18n';
import { JSXElement } from '@metamask/snaps-sdk/jsx';

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
      });

      expect(result).toMatchObject({
        children: ['Test Content'],
        element: 'Text',
        key: expect.any(String),
        props: {
          color: 'Default',
          fontWeight: 'normal',
          textAlign: 'left',
          variant: 'sBodyMD',
        },
      });
    });
  });
});
