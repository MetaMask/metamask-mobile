import { handleBatchSellUrl } from '../handleBatchSellUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import ReduxService from '../../../../redux';
import { selectBatchSellEnabled } from '../../../../../selectors/featureFlagController/batchSell';

jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(),
    },
  },
}));
jest.mock('../../../../../selectors/featureFlagController/batchSell', () => ({
  selectBatchSellEnabled: jest.fn(),
}));

describe('handleBatchSellUrl', () => {
  let mockNavigate: jest.Mock;
  let mockGetState: jest.Mock;
  let mockSelectBatchSellEnabled: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    (DevLogger.log as jest.Mock) = jest.fn();
    mockGetState = ReduxService.store.getState as jest.Mock;
    mockGetState.mockReturnValue({ mockState: true });
    mockSelectBatchSellEnabled = selectBatchSellEnabled as unknown as jest.Mock;
    mockSelectBatchSellEnabled.mockReturnValue(true);
  });

  it('navigates to the Batch Sell token selector when Batch Sell is enabled', async () => {
    await handleBatchSellUrl();

    expect(mockSelectBatchSellEnabled).toHaveBeenCalledWith({
      mockState: true,
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
    });
  });

  it('navigates to WALLET.HOME when Batch Sell is disabled', async () => {
    mockSelectBatchSellEnabled.mockReturnValue(false);

    await handleBatchSellUrl();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    expect(mockNavigate).not.toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
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

  it('logs when Batch Sell is disabled', async () => {
    mockSelectBatchSellEnabled.mockReturnValue(false);

    await handleBatchSellUrl();

    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleBatchSellUrl] Batch Sell is disabled',
    );
  });
});
