import type { CardProviderId } from '../provider-types';

/**
 * Card API DTO for GET /v1/providers/{providerId}/supported-regions.
 * Mapped by va-mmcx-card-api — not raw provider OpenAPI.
 */
export interface CardApiLegalDocument {
  title: string;
  url: string;
}

export interface CardApiRegionDocuments {
  generalTermsOfUse?: CardApiLegalDocument;
  privacyPolicy?: CardApiLegalDocument;
  disclosures: CardApiLegalDocument[];
  marketCompliance: CardApiLegalDocument[];
}

export interface CardApiSupportedRegion {
  code: string;
  name: string;
  isAvailable: boolean;
  unstructuredAddressAllowed: boolean;
  documents?: CardApiRegionDocuments;
}

export interface CardApiSupportedRegionsResponse {
  provider: CardProviderId;
  regions: CardApiSupportedRegion[];
}
