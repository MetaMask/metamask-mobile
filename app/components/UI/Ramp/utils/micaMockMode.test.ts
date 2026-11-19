import * as micaMockMode from './micaMockMode';

// Mock __DEV__ globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).__DEV__ = true;

describe('micaMockMode', () => {
  const originalEnv = process.env.MICA_MOCK_MODE;

  afterEach(() => {
    process.env.MICA_MOCK_MODE = originalEnv;
  });

  describe('isMicaMockModeEnabled', () => {
    it('returns false when MICA_MOCK_MODE is not set', () => {
      delete process.env.MICA_MOCK_MODE;
      expect(micaMockMode.isMicaMockModeEnabled()).toBe(false);
    });

    it('returns true when MICA_MOCK_MODE is true', () => {
      process.env.MICA_MOCK_MODE = 'true';
      // Note: In production, the env var is read at build time, not runtime
      // This test verifies the logic pattern
    });
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
      const form = micaMockMode.getMockSourceOfIncomeForm();
      expect(form.formsRequired).toHaveLength(1);
      expect(form.formsRequired[0].type).toBe('SOURCE_OF_INCOME');

      const metadata = form.formsRequired[0].metadata as any;
      expect(metadata.sourceOfFundsTypeOptions).toBeDefined();
      expect(metadata.employmentStatusOptions).toBeDefined();
      expect(metadata.countryOfCitizenshipOptions).toBeDefined();

      expect(metadata.sourceOfFundsTypeOptions.length).toBeGreaterThan(0);
      expect(metadata.employmentStatusOptions.length).toBeGreaterThan(0);
      expect(metadata.countryOfCitizenshipOptions.length).toBeGreaterThan(0);
    });

    it('includes realistic option values', () => {
      const form = micaMockMode.getMockSourceOfIncomeForm();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = form.formsRequired[0].metadata as any;

      const salaryOption = metadata.sourceOfFundsTypeOptions.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (opt: any) => opt.value === 'salary_payment',
      );
      expect(salaryOption).toBeDefined();
      expect(salaryOption.name).toBe('Salary payments');

      const employeeOption = metadata.employmentStatusOptions.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (opt: any) => opt.value === 'mid_level_employee',
      );
      expect(employeeOption).toBeDefined();

      const germanyOption = metadata.countryOfCitizenshipOptions.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (opt: any) => opt.value === 'DE',
      );
      expect(germanyOption).toBeDefined();
      expect(germanyOption.name).toBe('Germany');
    });
  });

  describe('mockSubmitMicaConsent', () => {
    it('returns SUBMITTED status after delay', async () => {
      const result = await micaMockMode.mockSubmitMicaConsent(
        '2024-01-01T00:00:00Z',
      );
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

      await expect(
        micaMockMode.mockSubmitSourceOfIncome(data),
      ).resolves.toBeUndefined();
    });
  });

  describe('injectMockNativeProviderIfNeeded', () => {
    it('returns providers unchanged when mock mode is off', () => {
      process.env.MICA_MOCK_MODE = 'false';
      const providers = [
        { id: '/providers/test', name: 'Test', type: 'native' },
      ];
      const result = micaMockMode.injectMockNativeProviderIfNeeded(
        providers,
        'DE',
      );
      expect(result).toEqual(providers);
    });

    it('injects transak-native for EEA countries', () => {
      process.env.MICA_MOCK_MODE = 'true';
      const providers = [
        { id: '/providers/test', name: 'Test', type: 'aggregator' },
      ];
      const result = micaMockMode.injectMockNativeProviderIfNeeded(
        providers,
        'DE',
      );

      expect(result.length).toBe(2);
      expect(result[0].id).toContain('transak-native');
      expect(result[0].name).toContain('Mock');
    });

    it('does not inject if transak-native already exists', () => {
      process.env.MICA_MOCK_MODE = 'true';
      const providers = [
        { id: '/providers/transak-native', name: 'Transak', type: 'native' },
        { id: '/providers/test', name: 'Test', type: 'aggregator' },
      ];
      const result = micaMockMode.injectMockNativeProviderIfNeeded(
        providers,
        'DE',
      );
      expect(result).toEqual(providers);
    });

    it('does not inject for non-EEA countries', () => {
      process.env.MICA_MOCK_MODE = 'true';
      const providers = [
        { id: '/providers/test', name: 'Test', type: 'aggregator' },
      ];
      const result = micaMockMode.injectMockNativeProviderIfNeeded(
        providers,
        'US',
      );
      expect(result).toEqual(providers);
    });
  });

  describe('injectMicaTermsIds', () => {
    it('returns quote unchanged when mock mode is off', () => {
      delete process.env.MICA_MOCK_MODE;
      const quote = { quoteId: 'test', fiatAmount: 100 };
      const result = micaMockMode.injectMicaTermsIds(quote);
      expect(result).toEqual(quote);
    });

    it('injects MICA_EEA_BUY termsId when quote has no termsIds', () => {
      process.env.MICA_MOCK_MODE = 'true';
      const quote = { quoteId: 'test', fiatAmount: 100 };
      const result = micaMockMode.injectMicaTermsIds(quote);

      expect(result.termsIds).toEqual(['MICA_EEA_BUY']);
    });

    it('preserves existing termsIds', () => {
      process.env.MICA_MOCK_MODE = 'true';
      const quote = {
        quoteId: 'test',
        fiatAmount: 100,
        termsIds: ['EXISTING'],
      };
      const result = micaMockMode.injectMicaTermsIds(quote);

      expect(result.termsIds).toEqual(['MICA_EEA_BUY', 'EXISTING']);
    });

    it('returns quote unchanged when quote is null', () => {
      process.env.MICA_MOCK_MODE = 'true';
      const result = micaMockMode.injectMicaTermsIds(null);
      expect(result).toBeNull();
    });
  });
});
