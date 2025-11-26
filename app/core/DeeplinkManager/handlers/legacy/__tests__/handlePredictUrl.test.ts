import { handlePredictUrl } from '../handlePredictUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';

// Mock dependencies
jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');

describe('handlePredictUrl', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup navigation mocks
    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    // Mock DevLogger
    (DevLogger.log as jest.Mock) = jest.fn();
  });

  describe('with market parameter', () => {
    it('navigates to market details when market parameter is provided', async () => {
      await handlePredictUrl({ predictPath: '?market=23246' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          entryPoint: 'deeplink',
        },
      });
    });

    it('navigates to market details when marketId parameter is provided', async () => {
      await handlePredictUrl({ predictPath: '?marketId=12345' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '12345',
          entryPoint: 'deeplink',
        },
      });
    });

    it('prioritizes market parameter over marketId when both are provided', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246&marketId=99999',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          entryPoint: 'deeplink',
        },
      });
    });

    it('extracts market ID from full URL path', async () => {
      await handlePredictUrl({ predictPath: 'predict?market=abc789' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: 'abc789',
          entryPoint: 'deeplink',
        },
      });
    });

    it('handles multiple URL parameters with utm_source in entryPoint', async () => {
      await handlePredictUrl({
        predictPath: '?market=xyz123&utm_source=campaign&debug=true',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: 'xyz123',
          entryPoint: 'deeplink_campaign',
        },
      });
    });

    it('handles numeric market IDs', async () => {
      await handlePredictUrl({ predictPath: '?market=9876543210' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '9876543210',
          entryPoint: 'deeplink',
        },
      });
    });

    it('handles alphanumeric market IDs', async () => {
      await handlePredictUrl({ predictPath: '?market=abc-123-xyz' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: 'abc-123-xyz',
          entryPoint: 'deeplink',
        },
      });
    });
  });

  describe('without market parameter', () => {
    it('navigates to market list when no parameters provided', async () => {
      await handlePredictUrl({ predictPath: '' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: 'deeplink',
        },
      });
    });

    it('navigates to market list when URL has no query parameters', async () => {
      await handlePredictUrl({ predictPath: 'predict' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: 'deeplink',
        },
      });
    });

    it('navigates to market list when market parameter is empty', async () => {
      await handlePredictUrl({ predictPath: '?market=' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: 'deeplink',
        },
      });
    });

    it('navigates to market list when marketId parameter is empty', async () => {
      await handlePredictUrl({ predictPath: '?marketId=' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: 'deeplink',
        },
      });
    });

    it('navigates to market list with utm_source in entryPoint when only utm_source provided', async () => {
      await handlePredictUrl({ predictPath: '?utm_source=campaign' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: 'deeplink_campaign',
        },
      });
    });
  });

  describe('error handling', () => {
    it('falls back to market list when navigation fails', async () => {
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      await handlePredictUrl({ predictPath: '?market=23246' });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenLastCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: 'deeplink',
        },
      });
    });

    it('falls back to market list when market details navigation throws', async () => {
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Market details navigation error');
      });

      await handlePredictUrl({ predictPath: '?marketId=invalid' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: 'deeplink',
        },
      });
    });

    it('handles malformed URL parameters gracefully', async () => {
      await handlePredictUrl({
        predictPath: 'predict?invalid&params&here',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: 'deeplink',
        },
      });
    });

    it('logs error details when handling fails', async () => {
      const testError = new Error('Test error');
      mockNavigate.mockImplementationOnce(() => {
        throw testError;
      });

      await handlePredictUrl({ predictPath: '?market=23246' });

      expect(DevLogger.log).toHaveBeenCalledWith(
        'Failed to handle predict deeplink:',
        testError,
      );
    });
  });

  describe('logging', () => {
    it('logs start of deeplink handling with path', async () => {
      await handlePredictUrl({ predictPath: '?market=23246' });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePredictUrl] Starting predict deeplink handling with path:',
        '?market=23246',
        'origin:',
        undefined,
      );
    });

    it('logs parsed navigation parameters', async () => {
      await handlePredictUrl({ predictPath: '?market=23246' });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePredictUrl] Parsed navigation parameters:',
        { market: '23246', utmSource: undefined },
      );
    });

    it('logs navigation to market details', async () => {
      await handlePredictUrl({ predictPath: '?market=23246' });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePredictUrl] Navigating to market details for market:',
        '23246',
      );
    });

    it('logs navigation to market list when no market provided', async () => {
      await handlePredictUrl({ predictPath: '' });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePredictUrl] No market parameter, showing list',
      );
    });

    it('logs fallback when market ID is empty', async () => {
      await handlePredictUrl({ predictPath: '?market=' });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePredictUrl] No market parameter, showing list',
      );
    });
  });

  describe('URL parsing edge cases', () => {
    it('handles URL with question mark but no parameters', async () => {
      await handlePredictUrl({ predictPath: 'predict?' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: 'deeplink',
        },
      });
    });

    it('handles URL with multiple question marks', async () => {
      await handlePredictUrl({ predictPath: 'predict?market=123?extra=param' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '123',
          entryPoint: 'deeplink',
        },
      });
    });

    it('handles URL with special characters in market ID', async () => {
      await handlePredictUrl({
        predictPath: '?market=test_market-123',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: 'test_market-123',
          entryPoint: 'deeplink',
        },
      });
    });

    it('handles URL with encoded parameters', async () => {
      await handlePredictUrl({
        predictPath: '?market=test%20market',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: 'test market',
          entryPoint: 'deeplink',
        },
      });
    });
  });

  describe('origin parameter handling', () => {
    it('sets entryPoint to carousel when origin is carousel', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246',
        origin: 'carousel',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          entryPoint: 'carousel',
        },
      });
    });

    it('sets entryPoint to deeplink when origin is undefined and no utm_source', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246',
        origin: undefined,
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          entryPoint: 'deeplink',
        },
      });
    });

    it('sets entryPoint to deeplink when origin is deeplink and no utm_source', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246',
        origin: 'deeplink',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          entryPoint: 'deeplink',
        },
      });
    });

    it('sets entryPoint to notification when origin is notification', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246',
        origin: 'notification',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          entryPoint: 'notification',
        },
      });
    });

    it('logs origin and entry point', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246',
        origin: 'carousel',
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePredictUrl] Starting predict deeplink handling with path:',
        '?market=23246',
        'origin:',
        'carousel',
      );
      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePredictUrl] Entry point:',
        'carousel',
      );
    });
  });

  describe('utm_source parameter handling', () => {
    it('sets entryPoint to deeplink_test when utm_source is test', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246&utm_source=test',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          entryPoint: 'deeplink_test',
        },
      });
    });

    it('sets entryPoint to deeplink_twitter when utm_source is twitter', async () => {
      await handlePredictUrl({
        predictPath: '?marketId=12345&utm_source=twitter',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '12345',
          entryPoint: 'deeplink_twitter',
        },
      });
    });

    it('appends utm_source to carousel origin', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246&utm_source=test',
        origin: 'carousel',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          entryPoint: 'carousel_test',
        },
      });
    });

    it('appends utm_source to deeplink origin', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246&utm_source=test',
        origin: 'deeplink',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          entryPoint: 'deeplink_test',
        },
      });
    });

    it('appends utm_source to notification origin', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246&utm_source=campaign',
        origin: 'notification',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          entryPoint: 'notification_campaign',
        },
      });
    });

    it('does not append utm_source when it equals origin', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246&utm_source=carousel',
        origin: 'carousel',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          entryPoint: 'carousel',
        },
      });
    });

    it('does not append utm_source when it equals default deeplink', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246&utm_source=deeplink',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          entryPoint: 'deeplink',
        },
      });
    });

    it('navigates to market list with deeplink_test entryPoint when no market but utm_source present', async () => {
      await handlePredictUrl({
        predictPath: '?utm_source=test',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: 'deeplink_test',
        },
      });
    });

    it('logs parsed utm_source in navigation parameters', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246&utm_source=test',
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePredictUrl] Parsed navigation parameters:',
        { market: '23246', utmSource: 'test' },
      );
    });

    it('logs entry point with utm_source suffix', async () => {
      await handlePredictUrl({
        predictPath: '?market=23246&utm_source=test',
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePredictUrl] Entry point:',
        'deeplink_test',
      );
    });
  });
});
