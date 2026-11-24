/**
 * Dev-only mock mode for testing the EU native Transak flow without staging support.
 * Enable by setting MICA_MOCK_MODE=true before building.
 */

import type {
  TransakAdditionalRequirementsResponse,
  Provider,
} from '@metamask/ramps-controller';
import Logger from '../../../../util/Logger';
import { isMicaMockModeEnabled } from './micaMockModeEnv';
import { EEA_COUNTRIES } from './eeaCountries';

export { isMicaMockModeEnabled, EEA_COUNTRIES };

export function getMockConsentForm(): TransakAdditionalRequirementsResponse {
  Logger.log('[MiCA Mock] Returning mock CONSENT form');
  return {
    formsRequired: [
      {
        type: 'CONSENT',
        metadata: {
          options: [],
          documentProofOptions: [],
          expiresAt: '',
          kycUrl: '',
          workFlowRunId: '',
        },
      },
    ],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function injectMicaTermsIds(quote: any): any {
  if (!isMicaMockModeEnabled() || !quote) {
    return quote;
  }

  Logger.log('[MiCA Mock] Injecting MICA_EEA_BUY termsId into quote');
  return {
    ...quote,
    termsIds: ['MICA_EEA_BUY', ...(quote.termsIds ?? [])],
  };
}

export function getMockSourceOfIncomeForm(): TransakAdditionalRequirementsResponse {
  Logger.log('[MiCA Mock] Returning mock SOURCE_OF_INCOME form');
  const metadata = {
    options: [],
    documentProofOptions: [],
    expiresAt: '',
    kycUrl: '',
    workFlowRunId: '',
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
      { name: 'Germany', value: 'DE' },
      { name: 'France', value: 'FR' },
      { name: 'Austria', value: 'AT' },
      { name: 'Belgium', value: 'BE' },
      { name: 'Spain', value: 'ES' },
      { name: 'Italy', value: 'IT' },
      { name: 'Netherlands', value: 'NL' },
      { name: 'Portugal', value: 'PT' },
      { name: 'Ireland', value: 'IE' },
      { name: 'Poland', value: 'PL' },
    ],
  };

  return {
    formsRequired: [
      {
        type: 'SOURCE_OF_INCOME',
        metadata,
      },
    ],
  };
}

/**
 * Mock successful consent submission.
 */
export async function mockSubmitMicaConsent(
  consentedAt: string,
): Promise<{ status: 'SUBMITTED' }> {
  Logger.log('[MiCA Mock] Faking consent submission', { consentedAt });
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { status: 'SUBMITTED' };
}

export async function mockSubmitSourceOfIncome(data: {
  monthlyVolume: string;
  sourceOfFundsType: string;
  employmentStatus?: string;
  countryOfCitizenship?: string;
}): Promise<{ status: 'SUBMITTED' }> {
  Logger.log('[MiCA Mock] Faking source of income submission', data);
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { status: 'SUBMITTED' };
}

/**
 * Injects transak-native provider for EU regions to bypass excludeEuTransakNative.
 */
export function injectMockNativeProviderIfNeeded(
  providers: Provider[],
  regionCode: string,
): Provider[] {
  if (!isMicaMockModeEnabled()) {
    return providers;
  }

  const isEEA = EEA_COUNTRIES.includes(regionCode.toUpperCase());
  if (!isEEA) {
    return providers;
  }

  const hasNative = providers.some((p) => p.id?.includes('transak-native'));
  if (hasNative) {
    return providers;
  }

  Logger.log('[MiCA Mock] Injecting transak-native provider for EU region', {
    regionCode,
  });

  return [
    {
      id: '/providers/transak-native-staging',
      name: 'Transak (Native - Mock)',
      type: 'native',
      environmentType: 'staging',
      description: 'Mock Transak native provider for MiCA testing',
      hqAddress: 'Mock Address',
      links: [],
      logos: {
        light: '',
        dark: '',
        height: 0,
        width: 0,
      },
    },
    ...providers,
  ];
}
