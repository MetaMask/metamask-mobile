import { PhishingController, PhishingDetectorResult, PhishingDetectorResultType } from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import {
  getPhishingTestResult,
  isProductSafetyDappScanningEnabled,
} from './phishingDetection';
import { selectBasicFunctionalityEnabled } from '../selectors/settings';

// Mock the environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});
afterAll(() => {
  process.env = originalEnv;
});

jest.mock('../core/Engine', () => ({
  context: {
    PhishingController: {
      maybeUpdateState: jest.fn(),
      test: jest.fn(),
    },
  },
}));

jest.mock('../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

// Mock the feature flag selector
jest.mock('../selectors/featureFlagController', () => ({
  selectProductSafetyDappScanningEnabled: jest.fn(),
}));

describe('Phishing Detection', () => {
  const mockPhishingController = Engine.context.PhishingController as jest.Mocked<PhishingController>;
  // Import and mock the feature flag selector
  const mockSelectProductSafetyDappScanningEnabled = jest.requireMock('../selectors/featureFlagController').selectProductSafetyDappScanningEnabled;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to false for the new feature flag
    mockSelectProductSafetyDappScanningEnabled.mockReturnValue(false);
  });

  describe('isProductSafetyDappScanningEnabled', () => {
    it('should return the value from selector', () => {
      mockSelectProductSafetyDappScanningEnabled.mockReturnValue(true);
      expect(isProductSafetyDappScanningEnabled()).toBe(true);
      mockSelectProductSafetyDappScanningEnabled.mockReturnValue(false);
      expect(isProductSafetyDappScanningEnabled()).toBe(false);
    });
  });

  describe('getPhishingTestResult', () => {
    it('should call maybeUpdateState and test with the provided origin', () => {
      const testOrigin = 'https://example.com';
      getPhishingTestResult(testOrigin);
      expect(mockPhishingController.maybeUpdateState).toHaveBeenCalledTimes(1);
      expect(mockPhishingController.test).toHaveBeenCalledWith(testOrigin);
    });

    it('should return the result from PhishingController.test', () => {
      const testOrigin = 'https://example.com';
      const mockResult: PhishingDetectorResult = {
        result: false,
        name: 'MetaMask',
        version: '1.0.0',
        type: PhishingDetectorResultType.All,
      };

      mockPhishingController.test.mockReturnValueOnce(mockResult);
      const result = getPhishingTestResult(testOrigin);

      expect(result).toEqual(mockResult);
    });

    it('calls PhishingController.test when product safety dapp scanning is enabled but ENABLE_DAPP_SCANNING is false', () => {
      // Ensure the environment variable is not set
      delete process.env.ENABLE_DAPP_SCANNING;

      mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
      mockSelectProductSafetyDappScanningEnabled.mockReturnValue(true);
      const mockResult = { result: false, name: 'Test', type: PhishingDetectorResultType.All };
      mockPhishingController.test.mockReturnValueOnce(mockResult);

      const result = getPhishingTestResult('example.com');
      expect(mockPhishingController.test).toHaveBeenCalledWith('example.com');
      expect(result).toEqual(mockResult);
    });
  });
});
