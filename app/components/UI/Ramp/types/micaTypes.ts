/**
 * Type shims for MiCA/EEA requirements, matching the core API from
 * https://github.com/MetaMask/core/pull/11636.
 * Remove this file after switching to the published preview package.
 */

export interface TransakAdditionalRequirementOption {
  name: string;
  value: string;
}

export interface TransakMicaConsentFormMetadata {}

export interface TransakSourceOfIncomeFormMetadata {
  options?: TransakAdditionalRequirementOption[];
  sourceOfFundsTypeOptions?: TransakAdditionalRequirementOption[];
  employmentStatusOptions?: TransakAdditionalRequirementOption[];
  countryOfCitizenshipOptions?: TransakAdditionalRequirementOption[];
}

export interface TransakAdditionalRequirementForm {
  type: 'CONSENT' | 'SOURCE_OF_INCOME' | 'IDPROOF' | 'PURPOSE_OF_USAGE';
  metadata?: 
    | TransakMicaConsentFormMetadata
    | TransakSourceOfIncomeFormMetadata
    | Record<string, unknown>;
}

export interface TransakAdditionalRequirementsResponse {
  formsRequired: TransakAdditionalRequirementForm[];
}
