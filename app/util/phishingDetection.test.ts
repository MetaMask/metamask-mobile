import { PhishingController, PhishingDetectorResult, PhishingDetectorResultType } from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import {
  getPhishingTestResult,
  isProductSafetyDappScanningEnabled,
} from './phishingDetection';
import { selectBasicFunctionalityEnabled } from '../selectors/settings';

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

jest.mock('../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(),
}));

// Mock the feature flag selector
jest.mock('../selectors/featureFlagController', () => ({
  selectProductSafetyDappScanningEnabled: jest.fn(),
}));

describe('Phishing Detection', () => {
  const mockPhishingController = Engine.context.PhishingController as jest.Mocked<PhishingController>;
  const mockSelectBasicFunctionalityEnabled = selectBasicFunctionalityEnabled as jest.MockedFunction<typeof selectBasicFunctionalityEnabled>;
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

    it('returns a negative result object if product safety dapp scanning is enabled', () => {
      mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
      mockSelectProductSafetyDappScanningEnabled.mockReturnValue(true);

      expect(getPhishingTestResult('example.com')).toEqual({
        result: false,
        name: 'Product safety dapp scanning is enabled',
        type: PhishingDetectorResultType.All
      });
      expect(mockPhishingController.test).not.toHaveBeenCalled();
    });
  });
});