import {
  DepositConfig,
  selectDepositConfig,
  selectRampsTransakWidgetUrlProxyEnabled,
  selectDepositEntrypointWalletActions,
  selectDepositEntrypoints,
  selectDepositProviderApiKey,
  selectDepositProviderFrontendAuth,
  selectDepositMinimumVersionFlag,
  selectDepositActiveFlag,
  selectDepositFeatures,
} from './index';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

jest.mock('../../../util/remoteFeatureFlag', () => ({
  validatedVersionGatedFeatureFlag: jest.fn(),
}));

const mockValidatedVersionGatedFeatureFlag =
  validatedVersionGatedFeatureFlag as jest.MockedFunction<
    typeof validatedVersionGatedFeatureFlag
  >;

describe('Deposit selectors', () => {
  const mockRemoteFeatureFlags: ReturnType<typeof selectRemoteFeatureFlags> & {
    depositConfig: DepositConfig;
  } = {
    depositConfig: {
      providerApiKey: 'test-api-key',
      providerFrontendAuth: 'test-frontend-auth',
      entrypoints: {
        walletActions: true,
      },
      minimumVersion: '1.5.0',
      active: true,
    },
  };

  const mockEmptyRemoteFeatureFlags = {};

  describe('selectDepositConfig', () => {
    it('should return the depositConfig when it exists', () => {
      const result = selectDepositConfig.resultFunc(mockRemoteFeatureFlags);
      expect(result).toEqual(mockRemoteFeatureFlags.depositConfig);
    });

    it('should return an empty object when depositConfig does not exist', () => {
      const result = selectDepositConfig.resultFunc(
        mockEmptyRemoteFeatureFlags,
      );
      expect(result).toEqual({});
    });
  });

  describe('selectDepositProviderApiKey', () => {
    it('should return the providerApiKey when it exists', () => {
      const result = selectDepositProviderApiKey.resultFunc(
        mockRemoteFeatureFlags.depositConfig,
      );
      expect(result).toBe('test-api-key');
    });

    it('should return null when providerApiKey does not exist', () => {
      const result = selectDepositProviderApiKey.resultFunc({});
      expect(result).toBeNull();
    });
  });

  describe('selectDepositProviderFrontendAuth', () => {
    it('should return the providerFrontendAuth when it exists', () => {
      const result = selectDepositProviderFrontendAuth.resultFunc(
        mockRemoteFeatureFlags.depositConfig,
      );
      expect(result).toBe('test-frontend-auth');
    });

    it('should return null when providerFrontendAuth does not exist', () => {
      const result = selectDepositProviderFrontendAuth.resultFunc({});
      expect(result).toBeNull();
    });
  });

  describe('selectDepositMinimumVersionFlag', () => {
    it('should return the minimumVersion when it exists', () => {
      const result = selectDepositMinimumVersionFlag.resultFunc(
        mockRemoteFeatureFlags.depositConfig,
      );
      expect(result).toBe('1.5.0');
    });

    it('should return null when minimumVersion does not exist', () => {
      const result = selectDepositMinimumVersionFlag.resultFunc({});
      expect(result).toBeNull();
    });
  });

  describe('selectDepositActiveFlag', () => {
    it('should return true when active is set to true', () => {
      const result = selectDepositActiveFlag.resultFunc(
        mockRemoteFeatureFlags.depositConfig,
      );
      expect(result).toBe(true);
    });

    it('should return false when active is not set', () => {
      const result = selectDepositActiveFlag.resultFunc({});
      expect(result).toBe(false);
    });
  });

  describe('selectDepositEntrypoints', () => {
    it('should return the entrypoints when they exist', () => {
      const result = selectDepositEntrypoints.resultFunc(
        mockRemoteFeatureFlags.depositConfig,
      );
      expect(result).toEqual(mockRemoteFeatureFlags.depositConfig.entrypoints);
    });

    it('should return undefined when entrypoints do not exist', () => {
      const result = selectDepositEntrypoints.resultFunc({});
      expect(result).toEqual(undefined);
    });
  });

  describe('selectDepositEntrypointWalletActions', () => {
    it('should return the walletActions entrypoint when it exists', () => {
      const result = selectDepositEntrypointWalletActions.resultFunc(
        mockRemoteFeatureFlags.depositConfig.entrypoints,
      );
      expect(result).toBe(true);
    });

    it('should return false when walletActions entrypoint does not exist', () => {
      const result = selectDepositEntrypointWalletActions.resultFunc({});
      expect(result).toBe(false);
    });
  });

  describe('selectDepositFeatures', () => {
    it('should return the features when they exist', () => {
      const mockFeatures = {
        featureA: true,
        featureB: false,
        featureC: null,
      };
      const mockDepositConfig = {
        ...mockRemoteFeatureFlags.depositConfig,
        features: mockFeatures,
      };
      const result = selectDepositFeatures.resultFunc(mockDepositConfig);
      expect(result).toEqual(mockFeatures);
    });

    it('should return an empty object when features do not exist', () => {
      const result = selectDepositFeatures.resultFunc({});
      expect(result).toEqual({});
    });
  });

  describe('selectRampsTransakWidgetUrlProxyEnabled', () => {
    beforeEach(() => {
      mockValidatedVersionGatedFeatureFlag.mockReset();
    });

    it('should pass the rampsTransakWidgetUrlProxy flag to the version-gate validator', () => {
      const proxyFlag = { enabled: true, minimumVersion: '8.1.0' };
      mockValidatedVersionGatedFeatureFlag.mockReturnValue(true);

      selectRampsTransakWidgetUrlProxyEnabled.resultFunc({
        rampsTransakWidgetUrlProxy: proxyFlag,
      });

      expect(mockValidatedVersionGatedFeatureFlag).toHaveBeenCalledWith(
        proxyFlag,
      );
    });

    it('should return true when the validated flag is enabled', () => {
      mockValidatedVersionGatedFeatureFlag.mockReturnValue(true);

      const result = selectRampsTransakWidgetUrlProxyEnabled.resultFunc({
        rampsTransakWidgetUrlProxy: { enabled: true, minimumVersion: '8.1.0' },
      });

      expect(result).toBe(true);
    });

    it('should return false when the validated flag is disabled', () => {
      mockValidatedVersionGatedFeatureFlag.mockReturnValue(false);

      const result = selectRampsTransakWidgetUrlProxyEnabled.resultFunc({
        rampsTransakWidgetUrlProxy: { enabled: false, minimumVersion: '0.0.0' },
      });

      expect(result).toBe(false);
    });

    it('should return false when the flag is absent or invalid (validator returns undefined)', () => {
      mockValidatedVersionGatedFeatureFlag.mockReturnValue(undefined);

      const result = selectRampsTransakWidgetUrlProxyEnabled.resultFunc({});

      expect(result).toBe(false);
    });
  });
});
