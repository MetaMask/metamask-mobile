import {
  PhishingController,
  PhishingDetectorResult,
  PhishingDetectorResultType,
} from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import {
  getPhishingTestResult,
  isProductSafetyDappScanningEnabled,
} from './phishingDetection';

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

jest.mock(
  '../selectors/featureFlagController/productSafetyDappScanning',
  () => ({
    selectProductSafetyDappScanningEnabled: jest.fn(),
  }),
);

describe('Phishing Detection', () => {
  const mockPhishingController = Engine.context
    .PhishingController as jest.Mocked<PhishingController>;
  const mockSelectProductSafetyDappScanningEnabled = jest.requireMock(
    '../selectors/featureFlagController/productSafetyDappScanning',
  ).selectProductSafetyDappScanningEnabled;

  beforeEach(() => {
    jest.clearAllMocks();
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

    it('calls PhishingController.test when product safety dapp scanning is disabled', () => {
      mockSelectProductSafetyDappScanningEnabled.mockReturnValue(false);
      const testOrigin = 'https://example.com';
      getPhishingTestResult(testOrigin);
      expect(mockPhishingController.maybeUpdateState).toHaveBeenCalledTimes(1);
      expect(mockPhishingController.test).toHaveBeenCalledWith(testOrigin);
    });

    it('returns hardcoded result when product safety dapp scanning is enabled', () => {
      mockSelectProductSafetyDappScanningEnabled.mockReturnValue(true);
      const mockResult = {
        result: false,
        name: 'Product safety dapp scanning is enabled',
        type: PhishingDetectorResultType.All,
      };

      const result = getPhishingTestResult('example.com');
      expect(mockPhishingController.test).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });
});
