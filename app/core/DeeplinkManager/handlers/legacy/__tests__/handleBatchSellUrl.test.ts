import { handleBatchSellUrl } from '../handleBatchSellUrl';
import { BatchSellMetricsLocation } from '@metamask/bridge-controller';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import ReduxService from '../../../../redux';
import AppConstants from '../../../../AppConstants';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { selectBatchSellEnabled } from '../../../../../selectors/featureFlagController/batchSell';
import { isHardwareAccount } from '../../../../../util/address';
import { selectIsSwapsEnabled } from '../../../../redux/slices/bridge';

jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../AppConstants', () => ({
  __esModule: true,
  default: {
    SWAPS: {
      ACTIVE: true,
    },
  },
}));
jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(),
    },
  },
}));
jest.mock('../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest.fn(),
}));
jest.mock('../../../../../selectors/featureFlagController/batchSell', () => ({
  selectBatchSellEnabled: jest.fn(),
}));
jest.mock('../../../../../util/address', () => ({
  isHardwareAccount: jest.fn(),
}));
jest.mock('../../../../redux/slices/bridge', () => ({
  selectIsSwapsEnabled: jest.fn(),
}));

const setSwapsActive = (isActive: boolean) => {
  (AppConstants.SWAPS as unknown as { ACTIVE: boolean }).ACTIVE = isActive;
};

describe('handleBatchSellUrl', () => {
  let mockNavigate: jest.Mock;
  let mockGetState: jest.Mock;
  let mockSelectSelectedInternalAccountAddress: jest.Mock;
  let mockSelectBatchSellEnabled: jest.Mock;
  let mockSelectIsSwapsEnabled: jest.Mock;
  let mockIsHardwareAccount: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    (DevLogger.log as jest.Mock) = jest.fn();
    mockGetState = ReduxService.store.getState as jest.Mock;
    mockGetState.mockReturnValue({ mockState: true });
    mockSelectSelectedInternalAccountAddress =
      selectSelectedInternalAccountAddress as unknown as jest.Mock;
    mockSelectSelectedInternalAccountAddress.mockReturnValue(
      '0x0000000000000000000000000000000000000001',
    );
    mockSelectBatchSellEnabled = selectBatchSellEnabled as unknown as jest.Mock;
    mockSelectBatchSellEnabled.mockReturnValue(true);
    mockSelectIsSwapsEnabled = selectIsSwapsEnabled as unknown as jest.Mock;
    mockSelectIsSwapsEnabled.mockReturnValue(true);
    mockIsHardwareAccount = isHardwareAccount as jest.Mock;
    mockIsHardwareAccount.mockReturnValue(false);
    setSwapsActive(true);
  });

  it('navigates to the Batch Sell token selector when Batch Sell is enabled', async () => {
    await handleBatchSellUrl();

    expect(mockSelectBatchSellEnabled).toHaveBeenCalledWith({
      mockState: true,
    });
    expect(mockSelectIsSwapsEnabled).toHaveBeenCalledWith({
      mockState: true,
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
      params: {
        batchSellLocation: BatchSellMetricsLocation.Deeplink,
      },
    });
  });

  it('navigates to WALLET.HOME when the Batch Sell feature flag is disabled', async () => {
    mockSelectBatchSellEnabled.mockReturnValue(false);

    await handleBatchSellUrl();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    expect(mockNavigate).not.toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
    });
  });

  it('navigates to WALLET.HOME when swaps are inactive', async () => {
    setSwapsActive(false);

    await handleBatchSellUrl();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    expect(mockNavigate).not.toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
    });
  });

  it('navigates to WALLET.HOME when swaps are disabled for the selected account', async () => {
    mockSelectIsSwapsEnabled.mockReturnValue(false);

    await handleBatchSellUrl();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    expect(mockNavigate).not.toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
    });
  });

  it('navigates to WALLET.HOME for hardware wallet accounts', async () => {
    mockIsHardwareAccount.mockReturnValue(true);

    await handleBatchSellUrl();

    expect(mockIsHardwareAccount).toHaveBeenCalledWith(
      '0x0000000000000000000000000000000000000001',
    );
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
