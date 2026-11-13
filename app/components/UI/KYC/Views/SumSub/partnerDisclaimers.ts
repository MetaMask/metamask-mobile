import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';

/**
 * Catalog group a document came from. `useKycSessionDisclaimers` prefixes each
 * `id` with its group, which is the only grouping the catalog carries through.
 */
export const DISCLAIMER_GROUP = {
  IDOS: 'idOS',
  KYC_PROVIDER: 'kycProvider',
} as const;

export interface GroupedDisclaimers {
  /** idOS legal documents, listed as rows. */
  idos: KycCatalogDisclaimerLink[];
  /** KYC-provider (SumSub) documents, led by the one the notice links. */
  kycProvider: KycCatalogDisclaimerLink[];
}

/**
 * Splits the flattened catalog back into its two groups.
 *
 * @param disclaimers - Flattened catalog from `useKycSessionDisclaimers`.
 * @returns The documents of each group, in catalog order.
 */
export const groupDisclaimers = (
  disclaimers: KycCatalogDisclaimerLink[],
): GroupedDisclaimers => ({
  idos: disclaimers.filter((disclaimer) =>
    disclaimer.id.startsWith(`${DISCLAIMER_GROUP.IDOS}:`),
  ),
  kycProvider: disclaimers.filter((disclaimer) =>
    disclaimer.id.startsWith(`${DISCLAIMER_GROUP.KYC_PROVIDER}:`),
  ),
});

/**
 * Finds the document a legal sentence refers to by name.
 *
 * The biometric-consent and idOS agreement sentences each name one document
 * ("idOS Privacy Notice", "idOS Terms and Conditions"), but the catalog is
 * keyed by the backend and is country-dependent, so there is no identifier to
 * match on. Matching the document `key` on a keyword is the closest the client
 * can get; callers render the label as plain text when nothing matches, so a
 * renamed key costs the sentence its link and never its meaning.
 *
 * @param disclaimers - Documents of one catalog group.
 * @param keyword - Lowercase fragment to look for in each document `key`.
 * @returns The first matching document, or `undefined`.
 */
export const findDisclaimerByKeyword = (
  disclaimers: KycCatalogDisclaimerLink[],
  keyword: string,
): KycCatalogDisclaimerLink | undefined =>
  disclaimers.find((disclaimer) =>
    disclaimer.key.toLowerCase().includes(keyword),
  );

/**
 * Whether an idOS document is listed in the terms card.
 *
 * The end user agreement, the terms row, and the privacy notice are omitted.
 * The agreement stays available as the footer link. Privacy policy and the
 * transparency document stay as rows.
 *
 * @param disclaimer - One idOS catalog document.
 * @returns True when the document should render as a row.
 */
export const isListedIdosDocument = (
  disclaimer: KycCatalogDisclaimerLink,
): boolean => {
  const haystack = `${disclaimer.key} ${disclaimer.title}`.toLowerCase();
  if (
    haystack.includes('end-user') ||
    haystack.includes('end user') ||
    haystack.includes('privacy-notice') ||
    haystack.includes('privacy notice') ||
    haystack.includes('terms') ||
    haystack.includes('agreement')
  ) {
    return false;
  }
  return true;
};
