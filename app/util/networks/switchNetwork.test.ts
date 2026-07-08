import switchNetwork from './switchNetwork';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../locales/i18n';
import { handleNetworkSwitch } from './handleNetworkSwitch';
import { store } from '../../store';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');

  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

jest.mock('../../store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(),
  },
}));

jest.mock('./handleNetworkSwitch', () => ({
  handleNetworkSwitch: jest.fn(),
}));

describe('switchNetwork', () => {
  const mockHandleNetworkSwitch = handleNetworkSwitch as jest.MockedFunction<
    typeof handleNetworkSwitch
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the switchNetwork function to return a valid network name
    mockHandleNetworkSwitch.mockReturnValue('Ethereum Mainnet');
  });

  it('should show a warning toast for a valid switchToChainId', () => {
    const switchToChainId = '1'; // Assuming '1' is a valid chain ID

    switchNetwork({ switchToChainId });

    expect(toast).toHaveBeenCalledWith({
      description: strings('send.warn_network_change') + 'Ethereum Mainnet',
      severity: ToastSeverity.Warning,
    });
  });

  it('should throw an error for an invalid switchToChainId', () => {
    const switchToChainId = '56' as `${number}` | undefined;
    mockHandleNetworkSwitch.mockReturnValue(undefined);

    expect(() => switchNetwork({ switchToChainId })).toThrow(
      `Unable to find network with chain id ${switchToChainId}`,
    );
  });

  it('should not show a toast when switchNetwork returns undefined', () => {
    const switchToChainId = '1'; // Assuming '1' is a valid chain ID
    mockHandleNetworkSwitch.mockReturnValue(undefined);

    switchNetwork({ switchToChainId });

    expect(toast).not.toHaveBeenCalled();
  });
});
