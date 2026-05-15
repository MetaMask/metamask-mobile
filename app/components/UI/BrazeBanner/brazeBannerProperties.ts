import { Banner } from '@braze/react-native-sdk';

/**
 * Reads the underlying raw property map on `CampaignProperties` directly rather
 * than calling the SDK's `getStringProperty` / `getNumberProperty` helpers,
 * which were not working.
 *
 * The Braze SDK occasionally nests the actual property entries one level deeper
 * under a `properties` key (i.e. `banner.properties.properties`). Both shapes
 * are checked so callers don't need to worry about the nesting level.
 */
export type RawProperties = Record<string, { type?: string; value?: unknown }>;

/**
 * Resolves the active property map from a banner, then looks up `key` in it.
 * The SDK sometimes nests properties under `banner.properties.properties`; if
 * that sub-object exists it is used, otherwise `banner.properties` is used.
 */
export function getRawProp(
  banner: Banner,
  key: string,
): { type?: string; value?: unknown } | undefined {
  // Defence-in-depth: the Braze JS bridge can produce unexpected shapes.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (banner == null) return undefined;

  const top = banner.properties as unknown as RawProperties;
  if (!top) return undefined;

  const nested = (top as unknown as { properties?: RawProperties }).properties;
  const props = nested && typeof nested === 'object' ? nested : top;

  return props[key];
}

export function getRawStringProp(banner: Banner, key: string): string | null {
  const prop = getRawProp(banner, key);
  return prop?.type === 'string' && typeof prop.value === 'string'
    ? prop.value
    : null;
}

/**
 * Like `getRawStringProp` but also accepts `type: 'image'`, which Braze uses
 * for image-type campaign properties.
 */
export function getRawStringOrImageProp(
  banner: Banner,
  key: string,
): string | null {
  const prop = getRawProp(banner, key);
  return (prop?.type === 'string' || prop?.type === 'image') &&
    typeof prop.value === 'string'
    ? prop.value
    : null;
}

export function getRawBooleanProp(banner: Banner, key: string): boolean | null {
  const prop = getRawProp(banner, key);
  if (prop?.type === 'boolean') {
    if (typeof prop.value === 'boolean') return prop.value;
    if (prop.value === 'true') return true;
    if (prop.value === 'false') return false;
  }
  return null;
}
