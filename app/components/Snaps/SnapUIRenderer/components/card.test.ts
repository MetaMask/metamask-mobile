import { Address, Card } from '@metamask/snaps-sdk/jsx';
import { card } from './card';
import { mockTheme } from '../../../../util/theme';

describe('card component mapper', () => {
  const defaultParams = {
    map: {},
    t: jest.fn(),
    theme: mockTheme,
  };

  it('maps basic strings', () => {
    expect(
      card({
        ...defaultParams,
        element: Card({
          title: 'Title',
          description: 'Description',
          value: 'Value',
          extra: 'Extra',
        }),
      }),
    ).toMatchInlineSnapshot(`
      {
        "element": "SnapUICard",
        "props": {
          "description": "Description",
          "extra": "Extra",
          "image": undefined,
          "title": "Title",
          "value": "Value",
        },
      }
    `);
  });

  it('supports elements in title', () => {
    expect(
      card({
        ...defaultParams,
        element: Card({
          title: Address({
            address: '0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb',
          }),
          description: 'Description',
          value: 'Value',
          extra: 'Extra',
        }),
      }),
    ).toMatchInlineSnapshot(`
      {
        "element": "SnapUICard",
        "propComponents": {
          "title": {
            "element": "SnapUIAddress",
            "key": "{"type":"Address","name":null,"children":null}_1",
            "props": {
              "address": "0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb",
              "avatar": undefined,
              "avatarSize": "16",
              "color": undefined,
              "displayName": undefined,
              "truncate": undefined,
            },
          },
        },
        "props": {
          "description": "Description",
          "extra": "Extra",
          "image": undefined,
          "value": "Value",
        },
      }
    `);
  });
});
