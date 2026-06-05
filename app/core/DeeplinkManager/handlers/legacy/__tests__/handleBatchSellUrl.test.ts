import { handleBatchSellUrl } from '../handleBatchSellUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';

jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');

describe('handleBatchSellUrl', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    (DevLogger.log as jest.Mock) = jest.fn();
  });

  it('navigates to the Batch Sell token selector', async () => {
    await handleBatchSellUrl();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
    });
  });

  it('logs start of deeplink handling', async () => {
    await handleBatchSellUrl();

    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleBatchSellUrl] Opening Batch Sell token selector',
    );
  });

  it('falls back to WALLET.HOME on navigation error', async () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigation error');
    });

    await handleBatchSellUrl();

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET.HOME);
  });

  it('logs error when navigation fails', async () => {
    const error = new Error('Navigation error');
    mockNavigate.mockImplementationOnce(() => {
      throw error;
    });

    await handleBatchSellUrl();

    expect(DevLogger.log).toHaveBeenCalledWith(
      'Failed to handle batch sell deeplink:',
      error,
    );
  });
});
