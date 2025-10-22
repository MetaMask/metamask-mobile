import { handlePredictUrl } from './handlePredictUrl';
import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';
import DevLogger from '../../SDKConnect/utils/DevLogger';

jest.mock('../../NavigationService');
jest.mock('../../SDKConnect/utils/DevLogger');

describe('handlePredictUrl', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    (DevLogger.log as jest.Mock) = jest.fn();
  });

  it('should navigate to feed when no market ID provided', async () => {
    await handlePredictUrl({ predictPath: '' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  });

  it('should navigate to feed when path is just "/"', async () => {
    await handlePredictUrl({ predictPath: '/' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  });

  it('should navigate to market details with market ID', async () => {
    const marketId = 'test-market-123';
    await handlePredictUrl({ predictPath: `/${marketId}` });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: { marketId },
    });
  });

  it('should navigate to market details without leading slash', async () => {
    const marketId = 'test-market-456';
    await handlePredictUrl({ predictPath: marketId });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: { marketId },
    });
  });

  it('should fallback to feed on error', async () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigation error');
    });

    await handlePredictUrl({ predictPath: '/some-market' });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenLastCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  });

  it('should handle complex market IDs with special characters', async () => {
    const marketId = '0xabc123-market-id';
    await handlePredictUrl({ predictPath: `/${marketId}` });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: { marketId },
    });
  });
});
