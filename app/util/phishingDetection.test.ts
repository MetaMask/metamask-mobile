import {
  PhishingController,
  PhishingDetectorResult,
  PhishingDetectorResultType,
  RecommendedAction,
} from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import {
  getPhishingTestResult,
  getPhishingTestResultAsync,
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
  });

  describe('getPhishingTestResultAsync', () => {
    beforeEach(() => {
      mockPhishingController.scanUrl = jest.fn();
    });

    it('should call maybeUpdateState and test with the provided origin when dapp scanning is disabled', async () => {
      mockSelectProductSafetyDappScanningEnabled.mockReturnValue(false);
      const testOrigin = 'https://example.com';
      const mockResult = {
        result: true,
        name: 'Test',
        type: PhishingDetectorResultType.All,
      };

      mockPhishingController.test.mockReturnValue(mockResult);

      const result = await getPhishingTestResultAsync(testOrigin);

      expect(mockPhishingController.maybeUpdateState).toHaveBeenCalledTimes(1);
      expect(mockPhishingController.test).toHaveBeenCalledWith(testOrigin);
      expect(result).toEqual(mockResult);
    });

    it('should call scanUrl when product safety dapp scanning is enabled', async () => {
      mockSelectProductSafetyDappScanningEnabled.mockReturnValue(true);
      const testOrigin = 'https://example.com';

      mockPhishingController.scanUrl.mockResolvedValue({
        recommendedAction: RecommendedAction.None,
        hostname: testOrigin,
      });

      const result = await getPhishingTestResultAsync(testOrigin);

      expect(mockPhishingController.scanUrl).toHaveBeenCalledWith(testOrigin);
      expect(result).toEqual({
        result: false,
        name: 'Product safety dapp scanning is enabled',
        type: 'DAPP_SCANNING',
      });
    });

    it('returns result=false when recommendedAction is None', async () => {
      mockSelectProductSafetyDappScanningEnabled.mockReturnValue(true);
      mockPhishingController.scanUrl.mockResolvedValue({
        recommendedAction: RecommendedAction.None,
        hostname: 'example.com',
      });

      const result = await getPhishingTestResultAsync('example.com');
      expect(result.result).toBe(false);
    });

    it('returns result=false when recommendedAction is Warn', async () => {
      mockSelectProductSafetyDappScanningEnabled.mockReturnValue(true);
      mockPhishingController.scanUrl.mockResolvedValue({
        recommendedAction: RecommendedAction.Warn,
        hostname: 'example.com',
      });

      const result = await getPhishingTestResultAsync('example.com');
      expect(result.result).toBe(false);
    });

    it('returns result=true when recommendedAction is Block', async () => {
      mockSelectProductSafetyDappScanningEnabled.mockReturnValue(true);
      mockPhishingController.scanUrl.mockResolvedValue({
        recommendedAction: RecommendedAction.Block,
        hostname: 'example.com',
      });

      const result = await getPhishingTestResultAsync('example.com');
      expect(result.result).toBe(true);
    });
  });
});
