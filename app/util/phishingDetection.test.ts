import {
  PhishingController,
  PhishingDetectorResult,
  RecommendedAction,
} from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import { getPhishingTestResultAsync } from './phishingDetection';

jest.mock('../core/Engine', () => ({
  context: {
    PhishingController: {
      scanUrl: jest.fn(),
    },
  },
}));

describe('Phishing Detection', () => {
  const mockPhishingController = Engine.context
    .PhishingController as jest.Mocked<PhishingController>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPhishingController.scanUrl = jest.fn();
  });

  describe('getPhishingTestResultAsync', () => {
    it('calls scanUrl with the provided origin', async () => {
      const testOrigin = 'https://example.com';
      mockPhishingController.scanUrl.mockResolvedValue({
        recommendedAction: RecommendedAction.None,
        hostname: testOrigin,
      });

      await getPhishingTestResultAsync(testOrigin);

      expect(mockPhishingController.scanUrl).toHaveBeenCalledWith(testOrigin);
    });

    it('returns result=false when recommendedAction is None', async () => {
      mockPhishingController.scanUrl.mockResolvedValue({
        recommendedAction: RecommendedAction.None,
        hostname: 'example.com',
      });

      const result = await getPhishingTestResultAsync('example.com');

      expect(result.result).toBe(false);
      expect(result.name).toBe('Product safety dapp scanning');
      expect(result.type).toBe('DAPP_SCANNING');
    });

    it('returns result=false when recommendedAction is Warn', async () => {
      mockPhishingController.scanUrl.mockResolvedValue({
        recommendedAction: RecommendedAction.Warn,
        hostname: 'example.com',
      });

      const result = await getPhishingTestResultAsync('example.com');

      expect(result.result).toBe(false);
    });

    it('returns result=false when recommendedAction is Verified', async () => {
      mockPhishingController.scanUrl.mockResolvedValue({
        recommendedAction: RecommendedAction.Verified,
        hostname: 'example.com',
      });

      const result = await getPhishingTestResultAsync('example.com');

      expect(result.result).toBe(false);
    });

    it('returns result=true when recommendedAction is Block', async () => {
      mockPhishingController.scanUrl.mockResolvedValue({
        recommendedAction: RecommendedAction.Block,
        hostname: 'example.com',
      });

      const result = await getPhishingTestResultAsync('example.com');

      expect(result.result).toBe(true);
    });

    it('returns proper PhishingDetectorResult structure', async () => {
      mockPhishingController.scanUrl.mockResolvedValue({
        recommendedAction: RecommendedAction.None,
        hostname: 'example.com',
      });

      const result: PhishingDetectorResult =
        await getPhishingTestResultAsync('example.com');

      expect(result).toEqual({
        result: false,
        name: 'Product safety dapp scanning',
        type: 'DAPP_SCANNING',
      });
    });
  });
});
