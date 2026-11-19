import type { Provider } from '@metamask/ramps-controller';
import {
  getMockConsentForm,
  getMockSourceOfIncomeForm,
  mockSubmitMicaConsent,
  mockSubmitSourceOfIncome,
  injectMockNativeProviderIfNeeded,
  injectMicaTermsIds,
} from './micaMockMode';

// Mock __DEV__ globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).__DEV__ = true;

// Mock the environment module so we can control isMicaMockModeEnabled
jest.mock('./micaMockModeEnv', () => ({
  isMicaMockModeEnabled: jest.fn(),
}));

import { isMicaMockModeEnabled } from './micaMockModeEnv';

function createMockProvider(overrides: Partial<Provider> = {}): Provider {
  return {
    id: '/providers/test',
    name: 'Test Provider',
    type: 'aggregator',
    environmentType: 'production',
    description: 'Test description',
    hqAddress: 'Test Address',
    links: [],
    logos: {
      light: '',
      dark: '',
      height: 0,
      width: 0,
    },
    ...overrides,
  };
}

describe('micaMockMode', () => {
  const mockIsMicaMockModeEnabled =
    isMicaMockModeEnabled as jest.MockedFunction<typeof isMicaMockModeEnabled>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMockConsentForm', () => {
    it('returns a CONSENT form', () => {
      const form = getMockConsentForm();
      expect(form.formsRequired).toHaveLength(1);
      expect(form.formsRequired[0].type).toBe('CONSENT');
      expect(form.formsRequired[0].metadata).toEqual({
        options: [],
        documentProofOptions: [],
        expiresAt: '',
        kycUrl: '',
        workFlowRunId: '',
      });
    });
  });

  describe('getMockSourceOfIncomeForm', () => {
    it('returns a SOURCE_OF_INCOME form with EEA fields', () => {
      const form = getMockSourceOfIncomeForm();
      expect(form.formsRequired).toHaveLength(1);
      expect(form.formsRequired[0].type).toBe('SOURCE_OF_INCOME');

      interface MetadataWithOptions {
        sourceOfFundsTypeOptions: { name: string; value: string }[];
        employmentStatusOptions: { name: string; value: string }[];
        countryOfCitizenshipOptions: { name: string; value: string }[];
      }
      const metadata = form.formsRequired[0]
        .metadata as unknown as MetadataWithOptions;
      expect(metadata.sourceOfFundsTypeOptions).toBeDefined();
      expect(metadata.employmentStatusOptions).toBeDefined();
      expect(metadata.countryOfCitizenshipOptions).toBeDefined();

      expect(metadata.sourceOfFundsTypeOptions.length).toBeGreaterThan(0);
      expect(metadata.employmentStatusOptions.length).toBeGreaterThan(0);
      expect(metadata.countryOfCitizenshipOptions.length).toBeGreaterThan(0);
    });

    it('includes realistic option values', () => {
      const form = getMockSourceOfIncomeForm();
      interface MetadataWithOptions {
        sourceOfFundsTypeOptions: { name: string; value: string }[];
        employmentStatusOptions: { name: string; value: string }[];
        countryOfCitizenshipOptions: { name: string; value: string }[];
      }
      const metadata = form.formsRequired[0]
        .metadata as unknown as MetadataWithOptions;

      const salaryOption = metadata.sourceOfFundsTypeOptions.find(
        (opt) => opt.value === 'salary_payment',
      );
      expect(salaryOption).toBeDefined();
      expect(salaryOption?.name).toBe('Salary payments');

      const employeeOption = metadata.employmentStatusOptions.find(
        (opt) => opt.value === 'mid_level_employee',
      );
      expect(employeeOption).toBeDefined();

      const germanyOption = metadata.countryOfCitizenshipOptions.find(
        (opt) => opt.value === 'DE',
      );
      expect(germanyOption).toBeDefined();
      expect(germanyOption?.name).toBe('Germany');
    });
  });

  describe('mockSubmitMicaConsent', () => {
    it('returns SUBMITTED status after delay', async () => {
      const result = await mockSubmitMicaConsent('2024-01-01T00:00:00Z');
      expect(result.status).toBe('SUBMITTED');
    });
  });

  describe('mockSubmitSourceOfIncome', () => {
    it('resolves successfully', async () => {
      const data = {
        monthlyVolume: '1000',
        sourceOfFundsType: 'salary_payment',
        employmentStatus: 'mid_level_employee',
        countryOfCitizenship: 'DE',
      };

      await expect(mockSubmitSourceOfIncome(data)).resolves.toBeUndefined();
    });
  });

  describe('injectMockNativeProviderIfNeeded', () => {
    it('returns providers unchanged when mock mode is off', () => {
      mockIsMicaMockModeEnabled.mockReturnValue(false);
      const providers = [
        createMockProvider({
          id: '/providers/test',
          name: 'Test',
          type: 'native',
        }),
      ];
      const result = injectMockNativeProviderIfNeeded(providers, 'DE');
      expect(result).toEqual(providers);
    });

    it('injects transak-native for EEA countries', () => {
      mockIsMicaMockModeEnabled.mockReturnValue(true);
      const providers = [
        createMockProvider({
          id: '/providers/test',
          name: 'Test',
          type: 'aggregator',
        }),
      ];
      const result = injectMockNativeProviderIfNeeded(providers, 'DE');

      expect(result.length).toBe(2);
      expect(result[0].id).toContain('transak-native');
      expect(result[0].name).toContain('Mock');
    });

    it('does not inject if transak-native already exists', () => {
      mockIsMicaMockModeEnabled.mockReturnValue(true);
      const providers = [
        createMockProvider({
          id: '/providers/transak-native',
          name: 'Transak',
          type: 'native',
        }),
        createMockProvider({
          id: '/providers/test',
          name: 'Test',
          type: 'aggregator',
        }),
      ];
      const result = injectMockNativeProviderIfNeeded(providers, 'DE');
      expect(result).toEqual(providers);
    });

    it('does not inject for non-EEA countries', () => {
      mockIsMicaMockModeEnabled.mockReturnValue(true);
      const providers = [
        createMockProvider({
          id: '/providers/test',
          name: 'Test',
          type: 'aggregator',
        }),
      ];
      const result = injectMockNativeProviderIfNeeded(providers, 'US');
      expect(result).toEqual(providers);
    });
  });

  describe('injectMicaTermsIds', () => {
    it('returns quote unchanged when mock mode is off', () => {
      mockIsMicaMockModeEnabled.mockReturnValue(false);
      const quote = { quoteId: 'test', fiatAmount: 100 };
      const result = injectMicaTermsIds(quote);
      expect(result).toEqual(quote);
    });

    it('injects MICA_EEA_BUY termsId when quote has no termsIds', () => {
      mockIsMicaMockModeEnabled.mockReturnValue(true);
      const quote = { quoteId: 'test', fiatAmount: 100 };
      const result = injectMicaTermsIds(quote);

      expect(result.termsIds).toEqual(['MICA_EEA_BUY']);
    });

    it('preserves existing termsIds', () => {
      mockIsMicaMockModeEnabled.mockReturnValue(true);
      const quote = {
        quoteId: 'test',
        fiatAmount: 100,
        termsIds: ['EXISTING'],
      };
      const result = injectMicaTermsIds(quote);

      expect(result.termsIds).toEqual(['MICA_EEA_BUY', 'EXISTING']);
    });

    it('returns quote unchanged when quote is null', () => {
      mockIsMicaMockModeEnabled.mockReturnValue(true);
      const result = injectMicaTermsIds(null);
      expect(result).toBeNull();
    });
  });
});
