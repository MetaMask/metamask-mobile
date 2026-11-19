import {
  TRANSAK_SUPPORT_URL,
  TRANSAK_TERMS_URL_WORLD,
} from '../../constants/transak';
import type { MicaConsentParams } from './MicaConsent';
import type { SourceOfIncomeParams } from './SourceOfIncome';

/**
 * Fixture data for the internal-build MiCA preview in Ramp Settings.
 * Option values mirror the `SOURCE_OF_INCOME` metadata in the Transak MiCA guide.
 */
export const MICA_CONSENT_PREVIEW_PARAMS: MicaConsentParams = {
  userDetails: {
    name: 'Anna Schmidt',
    address: 'Hauptstraße 12, 10115 Berlin, Germany',
    dateOfBirth: '14 March 1990',
    mobileNumber: '+49 151 2345 6789',
  },
  termsOfUseUrl: TRANSAK_TERMS_URL_WORLD,
  privacyPolicyUrl: 'https://www.transak.com/privacy-policy',
  supportUrl: TRANSAK_SUPPORT_URL,
};

export const SOURCE_OF_INCOME_PREVIEW_PARAMS: SourceOfIncomeParams = {
  sourceOfFundsTypeOptions: [
    { name: 'Salary payments', value: 'salary_payment' },
    { name: 'Savings', value: 'savings' },
    { name: 'Property sale', value: 'property_sale' },
    { name: 'Sale of crypto', value: 'sale_of_crypto' },
    { name: 'Inheritance', value: 'inheritance' },
    { name: 'Pension', value: 'pension' },
    { name: 'Loan', value: 'loan' },
    { name: 'Dividends', value: 'dividends' },
    { name: 'Gift or donation', value: 'gift_or_donation' },
    {
      name: 'Income from services provided',
      value: 'income_from_services_provided',
    },
    { name: 'Stock/Share sale', value: 'stock_share_sale' },
  ],
  employmentStatusOptions: [
    { name: 'Student', value: 'student' },
    { name: 'Retired', value: 'retired' },
    { name: 'Unemployed', value: 'unemployed' },
    { name: 'Self Employed', value: 'self_employed' },
    {
      name: 'Junior/Entry-Level Employee',
      value: 'junior_entry_level_employee',
    },
    { name: 'Mid-Level Employee', value: 'mid_level_employee' },
    { name: 'Management Role', value: 'management_role' },
    { name: 'Executive Role', value: 'executive_role' },
  ],
  countryOfCitizenshipOptions: [
    { name: 'Austria', value: 'AT' },
    { name: 'Belgium', value: 'BE' },
    { name: 'France', value: 'FR' },
    { name: 'Germany', value: 'DE' },
    { name: 'Ireland', value: 'IE' },
    { name: 'Italy', value: 'IT' },
    { name: 'Netherlands', value: 'NL' },
    { name: 'Poland', value: 'PL' },
    { name: 'Portugal', value: 'PT' },
    { name: 'Spain', value: 'ES' },
  ],
};
