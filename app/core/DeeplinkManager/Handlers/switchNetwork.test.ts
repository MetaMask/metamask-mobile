import switchNetwork from './switchNetwork';
import { showAlert } from '../../../actions/alert';
import { strings } from '../../../../locales/i18n';
import { handleNetworkSwitch } from '../../../util/networks/handleNetworkSwitch';
import { selectEvmChainId } from '../../../selectors/networkController';
import ReduxService from '../../redux';

jest.mock('../../../util/networks/handleNetworkSwitch', () => ({
  handleNetworkSwitch: jest.fn(),
}));

jest.mock('../../../actions/alert', () => ({
  showAlert: jest.fn(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(),
}));

jest.mock('../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      dispatch: jest.fn(),
      getState: jest.fn(),
    },
  },
}));

describe('switchNetwork', () => {
  const mockHandleNetworkSwitch = handleNetworkSwitch as jest.MockedFunction<
    typeof handleNetworkSwitch
  >;
  const mockSelectEvmChainId = selectEvmChainId as jest.MockedFunction<
    typeof selectEvmChainId
  >;
  const mockStore = ReduxService.store as jest.Mocked<
    typeof ReduxService.store
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the switchNetwork function to return a valid network name
    mockHandleNetworkSwitch.mockReturnValue('Ethereum Mainnet');
    mockSelectEvmChainId.mockReturnValue('0x1');
  });

  it('should dispatch an alert for a valid switchToChainId', () => {
    const switchToChainId = '1'; // Assuming '1' is a valid chain ID

    switchNetwork({ switchToChainId });

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      showAlert({
        isVisible: true,
        autodismiss: 5000,
        content: 'clipboard-alert',
        data: { msg: strings('send.warn_network_change') + 'Ethereum Mainnet' },
      }),
    );
  });

  it('should throw an error for an invalid switchToChainId', () => {
    const switchToChainId = '56' as `${number}` | undefined;
    mockHandleNetworkSwitch.mockReturnValue(undefined);
    mockSelectEvmChainId.mockReturnValue('0x1'); // Different from switchToChainId

    expect(() => switchNetwork({ switchToChainId })).toThrow(
      `Unable to find network with chain id ${switchToChainId}`,
    );
  });

  it('should not dispatch an alert when switchNetwork returns undefined', () => {
    const switchToChainId = '1'; // Assuming '1' is a valid chain ID
    mockHandleNetworkSwitch.mockReturnValue(undefined);
    mockSelectEvmChainId.mockReturnValue('0x1'); // Same as switchToChainId, should return early

    switchNetwork({ switchToChainId });

    expect(mockStore.dispatch).not.toHaveBeenCalled();
  });
});
