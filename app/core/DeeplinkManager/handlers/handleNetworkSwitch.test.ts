import handleNetworkSwitch from './handleNetworkSwitch';
import DeeplinkManager from '../DeeplinkManager';
import { showAlert } from '../../../actions/alert';
import { strings } from '../../../../locales/i18n';
import { handleNetworkSwitch as switchNetwork } from '../../../util/networks';

jest.mock('../../../util/networks', () => ({
  handleNetworkSwitch: jest.fn(),
}));

jest.mock('../../../actions/alert', () => ({
  showAlert: jest.fn(),
}));

describe('handleNetworkSwitch', () => {
  let deeplinkManager: DeeplinkManager;
  const mockSwitchNetwork = switchNetwork as jest.MockedFunction<
    typeof switchNetwork
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    deeplinkManager = {
      dispatch: jest.fn(),
    } as unknown as DeeplinkManager;

    // Mock the switchNetwork function to return a valid network name
    mockSwitchNetwork.mockReturnValue('Ethereum Mainnet');
  });

  it('should dispatch an alert for a valid switchToChainId', () => {
    const switchToChainId = '1'; // Assuming '1' is a valid chain ID

    handleNetworkSwitch({ deeplinkManager, switchToChainId });

    expect(deeplinkManager.dispatch).toHaveBeenCalledWith(
      showAlert({
        isVisible: true,
        autodismiss: 5000,
        content: 'clipboard-alert',
        data: { msg: strings('send.warn_network_change') + 'Ethereum Mainnet' },
      }),
    );
  });

  it('should not dispatch an alert when switchToChainId is undefined', () => {
    const switchToChainId = undefined;
    mockSwitchNetwork.mockReturnValue(undefined);

    handleNetworkSwitch({ deeplinkManager, switchToChainId });

    expect(deeplinkManager.dispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch an alert for an invalid switchToChainId', () => {
    const switchToChainId = 'invalid_chain_id' as `${number}` | undefined;
    mockSwitchNetwork.mockReturnValue(undefined);

    handleNetworkSwitch({ deeplinkManager, switchToChainId });

    expect(deeplinkManager.dispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch an alert when switchNetwork returns undefined', () => {
    const switchToChainId = '1'; // Assuming '1' is a valid chain ID
    mockSwitchNetwork.mockReturnValue(undefined);

    handleNetworkSwitch({ deeplinkManager, switchToChainId });

    expect(deeplinkManager.dispatch).not.toHaveBeenCalled();
  });
});
