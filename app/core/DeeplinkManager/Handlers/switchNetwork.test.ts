import switchNetwork from './switchNetwork';
import DeeplinkManager from '../DeeplinkManager';
import { showAlert } from '../../../actions/alert';
import { strings } from '../../../../locales/i18n';
import { handleNetworkSwitch } from '../../../util/networks';

jest.mock('../../../util/networks', () => ({
  handleNetworkSwitch: jest.fn(),
}));

jest.mock('../../../actions/alert', () => ({
  showAlert: jest.fn(),
}));

describe('switchNetwork', () => {
  let deeplinkManager: DeeplinkManager;
  const mockHandleNetworkSwitch = handleNetworkSwitch as jest.MockedFunction<
    typeof handleNetworkSwitch
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    deeplinkManager = {
      dispatch: jest.fn(),
    } as unknown as DeeplinkManager;

    // Mock the switchNetwork function to return a valid network name
    mockHandleNetworkSwitch.mockReturnValue('Ethereum Mainnet');
  });

  it('should dispatch an alert for a valid switchToChainId', () => {
    const switchToChainId = '1'; // Assuming '1' is a valid chain ID

    switchNetwork({ deeplinkManager, switchToChainId });

    expect(deeplinkManager.dispatch).toHaveBeenCalledWith(
      showAlert({
        isVisible: true,
        autodismiss: 5000,
        content: 'clipboard-alert',
        data: { msg: strings('send.warn_network_change') + 'Ethereum Mainnet' },
      }),
    );
  });

  it('should not dispatch an alert for an invalid switchToChainId', () => {
    const switchToChainId = 'invalid_chain_id' as `${number}` | undefined;
    mockHandleNetworkSwitch.mockReturnValue(undefined);

    switchNetwork({ deeplinkManager, switchToChainId });

    expect(deeplinkManager.dispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch an alert when switchNetwork returns undefined', () => {
    const switchToChainId = '1'; // Assuming '1' is a valid chain ID
    mockHandleNetworkSwitch.mockReturnValue(undefined);

    switchNetwork({ deeplinkManager, switchToChainId });

    expect(deeplinkManager.dispatch).not.toHaveBeenCalled();
  });
});
