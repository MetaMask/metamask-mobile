/**
 * Card API DTO for GET /v1/providers/immersve/supported-regions.
 * Mapped by va-mmcx-card-api — not raw Immersve OpenAPI.
 */
export interface CardApiImmersveLegalDocument {
  title: string;
  url: string;
}

export interface CardApiImmersveRegionDocuments {
  generalTermsOfUse?: CardApiImmersveLegalDocument;
  privacyPolicy?: CardApiImmersveLegalDocument;
  disclosures: CardApiImmersveLegalDocument[];
  marketCompliance: CardApiImmersveLegalDocument[];
}

export interface CardApiImmersveSupportedRegion {
  code: string;
  name: string;
  isAvailable: boolean;
  unstructuredAddressAllowed: boolean;
  documents?: CardApiImmersveRegionDocuments;
}

export interface CardApiImmersveSupportedRegionsResponse {
  provider: 'immersve';
  regions: CardApiImmersveSupportedRegion[];
}
