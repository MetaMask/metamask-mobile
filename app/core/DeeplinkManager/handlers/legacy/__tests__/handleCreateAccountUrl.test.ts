import NavigationService from '../../../../NavigationService';
import ReduxService from '../../../../redux/ReduxService';
import { resetBridgeState } from '../../../../redux/slices/bridge';
import { selectAccountsWithNativeBalanceByChainId } from '../../../../../selectors/multichain';
import Routes from '../../../../../constants/navigation/Routes';
import { handleCreateAccountUrl } from '../handleCreateAccountUrl';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../Engine', () => ({
  context: {
    BridgeController: {
      resetState: jest.fn(),
    },
  },
}));

jest.mock('../../../../../selectors/multichain', () => ({
  selectAccountsWithNativeBalanceByChainId: jest.fn(),
}));

const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
const mockDispatch = jest.fn();
const mockResetBridgeControllerState = jest.requireMock('../../../../Engine')
  .context.BridgeController.resetState as jest.Mock;
const mockSelectAccounts = jest.mocked(
  selectAccountsWithNativeBalanceByChainId,
);

// @ts-expect-error just for testing
ReduxService.store = {
  dispatch: mockDispatch,
  getState: jest.fn(),
};

describe('handleCreateAccountUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears the bridge session before opening swap for a funded chain', () => {
    mockSelectAccounts.mockReturnValue({
      'account-1': {
        amount: '1',
        unit: 'native',
        assetId: 'eip155:1/slip44:60',
      },
    });

    handleCreateAccountUrl({ path: 'chainId=eip155:1' });

    expect(mockDispatch).toHaveBeenCalledWith(resetBridgeState());
    expect(mockResetBridgeControllerState).toHaveBeenCalledTimes(1);
    expect(mockDispatch.mock.invocationCallOrder[0]).toBeLessThan(
      mockNavigate.mock.invocationCallOrder[0],
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BRIDGE.ROOT,
      expect.objectContaining({
        screen: Routes.BRIDGE.BRIDGE_VIEW,
      }),
    );
  });

  it.each([
    ['eip155:1', 'eip155:1/slip44:60'],
    [
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    ],
  ])(
    'opens Buy with the native asset for an unfunded %s account',
    (chainId, assetId) => {
      mockSelectAccounts.mockReturnValue({
        'account-1': { amount: '0', unit: 'native', assetId },
      });

      handleCreateAccountUrl({
        path: `?chainId=${encodeURIComponent(chainId)}`,
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY, {
        screen: Routes.RAMP.ID,
        params: {
          screen: Routes.RAMP.BUILD_QUOTE,
          params: { assetId },
        },
      });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockResetBridgeControllerState).not.toHaveBeenCalled();
    },
  );
});
