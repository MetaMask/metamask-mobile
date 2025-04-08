import { PhishingController, PhishingDetectorResult, PhishingDetectorResultType } from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import {
  getPhishingTestResult,
} from './phishingDetection';

jest.mock('../core/Engine', () => ({
  context: {
    PhishingController: {
      maybeUpdateState: jest.fn(),
      test: jest.fn(),
    },
  },
}));

describe('Phishing Detection', () => {
  const mockPhishingController = Engine.context.PhishingController as jest.Mocked<PhishingController>;
  beforeEach(() => {
    jest.clearAllMocks();
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
});
