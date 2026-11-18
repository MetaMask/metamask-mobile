/**
 * MiCA/EEA requirement types — shims for core types until the parallel core PR
 * is published and this mobile PR switches to it.
 *
 * Core PR: https://github.com/MetaMask/core/pull/11636
 * Branch: cursor/mica-eea-kyc-support-7ad1
 * Package: @metamask/ramps-controller
 *
 * TO SWITCH TO CORE PREVIEW:
 * 1. Add to package.json resolutions:
 *    "@metamask/ramps-controller": "npm:@metamask-previews/ramps-controller@<VERSION>"
 * 2. Run: yarn install
 * 3. Remove this file (micaTypes.ts)
 * 4. Update imports to use @metamask/ramps-controller types directly
 *
 * These shims match the exact core API so switching is trivial.
 */

/**
 * Option for dropdowns in MiCA forms.
 * Matches TransakAdditionalRequirementOption from core.
 */
export interface TransakAdditionalRequirementOption {
  name: string;
  value: string;
}

export interface TransakMicaConsentFormMetadata {
  // Consent form metadata is currently empty per Transak docs
}

export interface TransakSourceOfIncomeFormMetadata {
  /** Legacy field for non-EEA users */
  options?: TransakAdditionalRequirementOption[];
  /** Source of funds dropdown options (all users) */
  sourceOfFundsTypeOptions?: TransakAdditionalRequirementOption[];
  /** Employment status dropdown options (EEA users) */
  employmentStatusOptions?: TransakAdditionalRequirementOption[];
  /** Country of citizenship / nationality dropdown options (EEA users) */
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
