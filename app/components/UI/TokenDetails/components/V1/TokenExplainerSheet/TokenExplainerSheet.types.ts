/**
 * i18n keys for one term's definition sheet.
 *
 * The stat bar and the Security tab each keep their own `Record` of these,
 * keyed by their own row enum, so neither can add a row without a definition.
 * Only the shape is shared — the copy itself stays with the surface that owns
 * it.
 */
export interface ExplainerCopy {
  title: string;
  description: string;
}
