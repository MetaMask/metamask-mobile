import type {
  CardApiLegalDocument,
  CardApiRegionDocuments,
  CardApiSupportedRegion,
  CardApiSupportedRegionsResponse,
} from '../../../../core/Engine/controllers/card-controller/services/card-supported-regions.types';

export interface ImmersveLegalDocumentLink {
  id: string;
  title: string;
  url: string;
}

function toLink(
  id: string,
  legalDocument: CardApiLegalDocument | undefined,
): ImmersveLegalDocumentLink | null {
  if (!legalDocument?.url || !legalDocument.title) {
    return null;
  }
  return { id, title: legalDocument.title, url: legalDocument.url };
}

function mapDocumentList(
  prefix: string,
  documents: CardApiLegalDocument[] | undefined,
): ImmersveLegalDocumentLink[] {
  if (!documents?.length) {
    return [];
  }
  return documents.flatMap((legalDocument, index) => {
    const link = toLink(`${prefix}-${index}`, legalDocument);
    return link ? [link] : [];
  });
}

/**
 * Finds a region in the Card API supported-regions response by ISO code.
 */
export function getRegionByCode(
  response: CardApiSupportedRegionsResponse | null | undefined,
  code: string | null | undefined,
): CardApiSupportedRegion | null {
  if (!response?.regions?.length || !code) {
    return null;
  }
  return (
    response.regions.find(
      (region) => region.code.toUpperCase() === code.toUpperCase(),
    ) ?? null
  );
}

/**
 * Onboarding / SignUp clickwrap docs: terms, privacy, disclosures.
 * Excludes marketCompliance (permanent-access only).
 */
export function getOnboardingLegalDocuments(
  documents: CardApiRegionDocuments | null | undefined,
): ImmersveLegalDocumentLink[] {
  if (!documents) {
    return [];
  }
  return [
    toLink('generalTermsOfUse', documents.generalTermsOfUse),
    toLink('privacyPolicy', documents.privacyPolicy),
    ...mapDocumentList('disclosure', documents.disclosures),
  ].filter((link): link is ImmersveLegalDocumentLink => link !== null);
}

/**
 * Permanent / Card Home docs: onboarding set plus marketCompliance.
 */
export function getPermanentLegalDocuments(
  documents: CardApiRegionDocuments | null | undefined,
): ImmersveLegalDocumentLink[] {
  if (!documents) {
    return [];
  }
  return [
    ...getOnboardingLegalDocuments(documents),
    ...mapDocumentList('marketCompliance', documents.marketCompliance),
  ];
}
