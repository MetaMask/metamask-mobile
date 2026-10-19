import type { SocialV1MockedField } from '../mockMarker';

/**
 * The label to render for a field the client may have invented.
 *
 * A field listed in `mockedFields` is hidden unless the surface opted into
 * showing invented values. A field that is not listed is real data and always
 * renders. Hiding returns `undefined`, which the stat rows draw as an em dash
 * and the mark-price line omits.
 */
export const mockedFieldLabel = (
  label: string | undefined,
  field: SocialV1MockedField,
  mockedFields: readonly SocialV1MockedField[] | undefined,
  showMockedFields: boolean,
): string | undefined => {
  if (!showMockedFields && mockedFields?.includes(field)) {
    return undefined;
  }
  return label;
};
