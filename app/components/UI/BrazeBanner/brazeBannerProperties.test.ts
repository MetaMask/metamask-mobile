import { type Banner } from '@braze/react-native-sdk';
import {
  getRawBooleanProp,
  getRawProp,
  getRawStringOrImageProp,
  getRawStringProp,
} from './brazeBannerProperties';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PropEntry {
  type?: string;
  value?: unknown;
}
type FlatShape = Record<string, PropEntry>;
interface NestedShape {
  properties: Record<string, PropEntry>;
}

/** Braze flat shape: banner.properties.key */
function makeFlatBanner(props: FlatShape): Banner {
  return { properties: props } as unknown as Banner;
}

/** Braze nested shape: banner.properties.properties.key */
function makeNestedBanner(props: Record<string, PropEntry>): Banner {
  return {
    properties: { properties: props } as unknown as NestedShape,
  } as unknown as Banner;
}

function makeBannerWithNoProperties(): Banner {
  return {} as unknown as Banner;
}

// ---------------------------------------------------------------------------
// Defensive input: every function must return null for any unexpected input
// ---------------------------------------------------------------------------
describe('handles unexpected runtime inputs gracefully', () => {
  it.each([
    ['null banner', null],
    ['undefined banner', undefined],
    ['banner.properties is null', { properties: null }],
    ['banner.properties is a number', { properties: 42 }],
    ['banner.properties is a string', { properties: 'bad' }],
    ['banner.properties is an array', { properties: [] }],
    ['property entry is null', { properties: { body: null } }],
    [
      'property entry is a primitive string',
      { properties: { body: 'raw-string' } },
    ],
    ['property entry is a number', { properties: { body: 42 } }],
    [
      'property entry has no type field',
      { properties: { body: { value: 'hello' } } },
    ],
    [
      'property entry has no value field',
      { properties: { body: { type: 'string' } } },
    ],
  ] as [string, unknown][])(
    'getRawStringProp returns null when %s',
    (_, value) => {
      expect(getRawStringProp(value as unknown as Banner, 'body')).toBeNull();
    },
  );

  it.each([
    ['null banner', null],
    ['undefined banner', undefined],
    ['banner.properties is null', { properties: null }],
    ['banner.properties is a number', { properties: 42 }],
    ['banner.properties is a string', { properties: 'bad' }],
    ['banner.properties is an array', { properties: [] }],
    ['property entry is null', { properties: { image_url: null } }],
    [
      'property entry is a primitive string',
      { properties: { image_url: 'raw-string' } },
    ],
    [
      'property entry has no type field',
      { properties: { image_url: { value: 'https://x.com' } } },
    ],
    [
      'property entry has no value field',
      { properties: { image_url: { type: 'image' } } },
    ],
  ] as [string, unknown][])(
    'getRawStringOrImageProp returns null when %s',
    (_, value) => {
      expect(
        getRawStringOrImageProp(value as unknown as Banner, 'image_url'),
      ).toBeNull();
    },
  );

  it.each([
    ['null banner', null],
    ['undefined banner', undefined],
    ['banner.properties is null', { properties: null }],
    ['banner.properties is a number', { properties: 42 }],
    ['banner.properties is a string', { properties: 'bad' }],
    ['banner.properties is an array', { properties: [] }],
    ['property entry is null', { properties: { dismissable: null } }],
    [
      'property entry has wrong type',
      { properties: { dismissable: { type: 'string', value: 'true' } } },
    ],
    [
      'property entry has no value field',
      { properties: { dismissable: { type: 'boolean' } } },
    ],
    [
      'property entry value is a number',
      { properties: { dismissable: { type: 'boolean', value: 1 } } },
    ],
  ] as [string, unknown][])(
    'getRawBooleanProp returns null when %s',
    (_, value) => {
      expect(
        getRawBooleanProp(value as unknown as Banner, 'dismissable'),
      ).toBeNull();
    },
  );
});

// ---------------------------------------------------------------------------
// getRawProp
// ---------------------------------------------------------------------------
describe('getRawProp', () => {
  it('returns undefined when banner has no properties', () => {
    expect(getRawProp(makeBannerWithNoProperties(), 'body')).toBeUndefined();
  });

  it('returns undefined when key is absent from flat properties', () => {
    expect(getRawProp(makeFlatBanner({}), 'body')).toBeUndefined();
  });

  it('reads from flat shape: banner.properties.key', () => {
    const banner = makeFlatBanner({ body: { type: 'string', value: 'Hello' } });
    expect(getRawProp(banner, 'body')).toEqual({
      type: 'string',
      value: 'Hello',
    });
  });

  it('reads from nested shape: banner.properties.properties.key', () => {
    const banner = makeNestedBanner({
      body: { type: 'string', value: 'Nested' },
    });
    expect(getRawProp(banner, 'body')).toEqual({
      type: 'string',
      value: 'Nested',
    });
  });

  it('prefers nested shape when both levels exist', () => {
    const banner = {
      properties: {
        body: { type: 'string', value: 'flat' },
        properties: {
          body: { type: 'string', value: 'nested' },
        },
      },
    } as unknown as Banner;
    expect(getRawProp(banner, 'body')).toEqual({
      type: 'string',
      value: 'nested',
    });
  });

  it('ignores properties.properties when it is not an object', () => {
    const banner = {
      properties: {
        properties: 'not-an-object',
        body: { type: 'string', value: 'flat' },
      },
    } as unknown as Banner;
    expect(getRawProp(banner, 'body')).toEqual({
      type: 'string',
      value: 'flat',
    });
  });

  it('falls back to flat level when properties.properties is null', () => {
    const banner = {
      properties: {
        properties: null,
        body: { type: 'string', value: 'flat' },
      },
    } as unknown as Banner;
    expect(getRawProp(banner, 'body')).toEqual({
      type: 'string',
      value: 'flat',
    });
  });

  it('returns undefined for absent key in nested shape', () => {
    const banner = makeNestedBanner({
      title: { type: 'string', value: 'Title' },
    });
    expect(getRawProp(banner, 'body')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getRawStringProp
// ---------------------------------------------------------------------------
describe('getRawStringProp', () => {
  describe('flat shape', () => {
    it('returns null when key is absent', () => {
      expect(getRawStringProp(makeFlatBanner({}), 'body')).toBeNull();
    });

    it('returns value when type is string', () => {
      const banner = makeFlatBanner({
        body: { type: 'string', value: 'Hello' },
      });
      expect(getRawStringProp(banner, 'body')).toBe('Hello');
    });

    it('returns null when type is not string', () => {
      const banner = makeFlatBanner({ body: { type: 'number', value: 42 } });
      expect(getRawStringProp(banner, 'body')).toBeNull();
    });

    it('returns null when value is not a string', () => {
      const banner = makeFlatBanner({ body: { type: 'string', value: 123 } });
      expect(getRawStringProp(banner, 'body')).toBeNull();
    });

    it('returns null when type is image', () => {
      const banner = makeFlatBanner({
        image_url: { type: 'image', value: 'https://example.com/img.png' },
      });
      expect(getRawStringProp(banner, 'image_url')).toBeNull();
    });

    it('returns null when type is boolean', () => {
      const banner = makeFlatBanner({
        dismissable: { type: 'boolean', value: true },
      });
      expect(getRawStringProp(banner, 'dismissable')).toBeNull();
    });

    it('returns null when prop entry has no type', () => {
      const banner = makeFlatBanner({ body: { value: 'Hello' } });
      expect(getRawStringProp(banner, 'body')).toBeNull();
    });

    it('returns null when prop entry has no value', () => {
      const banner = makeFlatBanner({ body: { type: 'string' } });
      expect(getRawStringProp(banner, 'body')).toBeNull();
    });
  });

  describe('nested shape (banner.properties.properties)', () => {
    it('returns value from nested shape', () => {
      const banner = makeNestedBanner({
        body: { type: 'string', value: 'Nested body' },
      });
      expect(getRawStringProp(banner, 'body')).toBe('Nested body');
    });

    it('returns null for absent key in nested shape', () => {
      const banner = makeNestedBanner({
        title: { type: 'string', value: 'Title' },
      });
      expect(getRawStringProp(banner, 'body')).toBeNull();
    });

    it('reads all expected campaign property keys from nested shape', () => {
      const banner = makeNestedBanner({
        body: { type: 'string', value: 'Body text' },
        title: { type: 'string', value: 'Title text' },
        deeplink: { type: 'string', value: 'metamask://home' },
        banner_id: { type: 'string', value: 'campaign-123' },
        cta_label: { type: 'string', value: 'Enable' },
      });
      expect(getRawStringProp(banner, 'body')).toBe('Body text');
      expect(getRawStringProp(banner, 'title')).toBe('Title text');
      expect(getRawStringProp(banner, 'deeplink')).toBe('metamask://home');
      expect(getRawStringProp(banner, 'banner_id')).toBe('campaign-123');
      expect(getRawStringProp(banner, 'cta_label')).toBe('Enable');
    });
  });

  describe('no properties', () => {
    it('returns null when banner has no properties at all', () => {
      expect(getRawStringProp(makeBannerWithNoProperties(), 'body')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// getRawStringOrImageProp
// ---------------------------------------------------------------------------
describe('getRawStringOrImageProp', () => {
  describe('flat shape', () => {
    it('returns value when type is string', () => {
      const banner = makeFlatBanner({
        image_url: { type: 'string', value: 'https://example.com/flat.png' },
      });
      expect(getRawStringOrImageProp(banner, 'image_url')).toBe(
        'https://example.com/flat.png',
      );
    });

    it('returns value when type is image', () => {
      const banner = makeFlatBanner({
        image_url: { type: 'image', value: 'https://example.com/flat.png' },
      });
      expect(getRawStringOrImageProp(banner, 'image_url')).toBe(
        'https://example.com/flat.png',
      );
    });

    it('returns null when type is number', () => {
      const banner = makeFlatBanner({
        image_url: { type: 'number', value: 42 },
      });
      expect(getRawStringOrImageProp(banner, 'image_url')).toBeNull();
    });

    it('returns null when value is not a string even for image type', () => {
      const banner = makeFlatBanner({
        image_url: { type: 'image', value: 42 },
      });
      expect(getRawStringOrImageProp(banner, 'image_url')).toBeNull();
    });

    it('returns null when key is absent', () => {
      expect(
        getRawStringOrImageProp(makeFlatBanner({}), 'image_url'),
      ).toBeNull();
    });
  });

  describe('nested shape', () => {
    it('returns value when type is image in nested shape', () => {
      const banner = makeNestedBanner({
        image_url: { type: 'image', value: 'https://example.com/nested.png' },
      });
      expect(getRawStringOrImageProp(banner, 'image_url')).toBe(
        'https://example.com/nested.png',
      );
    });

    it('returns value when type is string in nested shape', () => {
      const banner = makeNestedBanner({
        image_url: { type: 'string', value: 'https://example.com/nested.png' },
      });
      expect(getRawStringOrImageProp(banner, 'image_url')).toBe(
        'https://example.com/nested.png',
      );
    });
  });
});

// ---------------------------------------------------------------------------
// getRawBooleanProp
// ---------------------------------------------------------------------------
describe('getRawBooleanProp', () => {
  describe('flat shape', () => {
    it('returns true when value is boolean true', () => {
      const banner = makeFlatBanner({
        dismissable: { type: 'boolean', value: true },
      });
      expect(getRawBooleanProp(banner, 'dismissable')).toBe(true);
    });

    it('returns false when value is boolean false', () => {
      const banner = makeFlatBanner({
        dismissable: { type: 'boolean', value: false },
      });
      expect(getRawBooleanProp(banner, 'dismissable')).toBe(false);
    });

    it('returns true when value is the string "true"', () => {
      const banner = makeFlatBanner({
        dismissable: { type: 'boolean', value: 'true' },
      });
      expect(getRawBooleanProp(banner, 'dismissable')).toBe(true);
    });

    it('returns false when value is the string "false"', () => {
      const banner = makeFlatBanner({
        dismissable: { type: 'boolean', value: 'false' },
      });
      expect(getRawBooleanProp(banner, 'dismissable')).toBe(false);
    });

    it('returns null when type is string (not boolean)', () => {
      const banner = makeFlatBanner({
        dismissable: { type: 'string', value: 'true' },
      });
      expect(getRawBooleanProp(banner, 'dismissable')).toBeNull();
    });

    it('returns null when type is number', () => {
      const banner = makeFlatBanner({
        dismissable: { type: 'number', value: 1 },
      });
      expect(getRawBooleanProp(banner, 'dismissable')).toBeNull();
    });

    it('returns null when key is absent', () => {
      expect(getRawBooleanProp(makeFlatBanner({}), 'dismissable')).toBeNull();
    });

    it('returns null when value is an unexpected string like "yes"', () => {
      const banner = makeFlatBanner({
        dismissable: { type: 'boolean', value: 'yes' },
      });
      expect(getRawBooleanProp(banner, 'dismissable')).toBeNull();
    });

    it('returns null when value is a number even with boolean type', () => {
      const banner = makeFlatBanner({
        dismissable: { type: 'boolean', value: 1 },
      });
      expect(getRawBooleanProp(banner, 'dismissable')).toBeNull();
    });
  });

  describe('nested shape', () => {
    it('returns true from nested shape', () => {
      const banner = makeNestedBanner({
        dismissable: { type: 'boolean', value: true },
      });
      expect(getRawBooleanProp(banner, 'dismissable')).toBe(true);
    });

    it('returns false from nested shape', () => {
      const banner = makeNestedBanner({
        dismissable: { type: 'boolean', value: false },
      });
      expect(getRawBooleanProp(banner, 'dismissable')).toBe(false);
    });

    it('coerces string "true" in nested shape', () => {
      const banner = makeNestedBanner({
        dismissable: { type: 'boolean', value: 'true' },
      });
      expect(getRawBooleanProp(banner, 'dismissable')).toBe(true);
    });
  });
});
