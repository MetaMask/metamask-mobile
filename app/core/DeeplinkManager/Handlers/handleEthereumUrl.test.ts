import { parse } from 'eth-url-parser';
import { Alert } from 'react-native';
import { ETH_ACTIONS } from '../../../constants/deeplinks';
import { NetworkSwitchErrorType } from '../../../constants/error';
import DeeplinkManager from '../DeeplinkManager';
import handleEthereumUrl from './handleEthereumUrl';
import { getDecimalChainId } from '../../../util/networks';
import Engine from '../../Engine';
import { MAINNET } from '../../../constants/network';

jest.mock('react-native');

jest.mock('eth-url-parser', () => ({
  parse: jest.fn(),
}));

jest.mock('../../../util/networks', () => ({
  getDecimalChainId: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../Engine', () => ({
  context: {
    MultichainNetworkController: {
      state: {
        isEvmSelected: true,
      },
      setActiveNetwork: jest.fn(),
    },
  },
}));

describe('handleEthereumUrl', () => {
  let deeplinkManager: DeeplinkManager;
  const mockParse = parse as jest.Mock;
  const mockGetDecimalChainId = getDecimalChainId as jest.Mock;

  const mockHandleNetworkSwitch = jest.fn();
  const mockNavigate = jest.fn();
  const mockApproveTransaction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    deeplinkManager = {
      _handleNetworkSwitch: mockHandleNetworkSwitch,
      _approveTransaction: mockApproveTransaction,
      navigation: {
        navigate: mockNavigate,
      },
    } as unknown as DeeplinkManager;

    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
    });

    mockHandleNetworkSwitch.mockImplementation(() => {
      // do nothing
    });

    mockNavigate.mockImplementation(() => {
      // do nothing
    });
  });

  it('should alerts and returns on invalid URL', () => {
    const spyAlert = jest.spyOn(Alert, 'alert');

    const url = 'invalid_url';
    const origin = 'test_origin';

    mockParse.mockImplementation(() => {
      throw new Error('Invalid URL');
    });

    handleEthereumUrl({ deeplinkManager, url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'deeplink.invalid',
      'Error: Invalid URL',
    );
  });

  it('Should show deprecation modal if url is a goerli url', () => {
    const url = 'ethereum:transfer';
    const origin = 'test_origin';
    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 5,
    });

    mockGetDecimalChainId.mockReturnValue(5);

    handleEthereumUrl({ deeplinkManager, url, origin });

    expect(deeplinkManager.navigation.navigate).toHaveBeenCalledWith(
      'DeprecatedNetworkDetails',
      {},
    );
    expect(deeplinkManager._handleNetworkSwitch).toHaveBeenCalledTimes(0);
  });

  it('should navigates to SendView for TRANSFER action', () => {
    const url = 'ethereum:transfer';
    const origin = 'test_origin';
    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
    });

    handleEthereumUrl({ deeplinkManager, url, origin });

    expect(deeplinkManager.navigation.navigate).toHaveBeenCalledWith(
      'SendView',
      expect.any(Object),
    );
  });

  it('should handles network switch error', () => {
    const spyAlert = jest.spyOn(Alert, 'alert');

    const url = 'ethereum:transfer';
    const origin = 'test_origin';

    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
    });

    mockHandleNetworkSwitch.mockImplementation(() => {
      throw new Error(NetworkSwitchErrorType.missingNetworkId);
    });

    handleEthereumUrl({ deeplinkManager, url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'send.network_not_found_title',
      'send.network_missing_id',
    );
  });

  it('should calls _approveTransaction for APPROVE action', () => {
    const url = 'ethereum:approve';
    const origin = 'test_origin';
    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.APPROVE,
      chain_id: 1,
      parameters: {},
    });

    handleEthereumUrl({ deeplinkManager, url, origin });

    expect(deeplinkManager._approveTransaction).toHaveBeenCalledWith(
      expect.any(Object),
      origin,
    );
  });

  it('should navigates to SendFlowView for default action', () => {
    const url = 'ethereum:unknownAction';
    const origin = 'test_origin';
    mockParse.mockReturnValue({
      function_name: 'unknownAction',
      chain_id: 1,
      parameters: {},
    });

    handleEthereumUrl({ deeplinkManager, url, origin });

    expect(deeplinkManager.navigation.navigate).toHaveBeenCalledWith(
      'SendFlowView',
      expect.any(Object),
    );
  });

  it('should handles unknown errors during Ethereum URL handling', () => {
    const spyAlert = jest.spyOn(Alert, 'alert');

    const url = 'ethereum:transfer';
    const origin = 'test_origin';
    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
    });
    mockHandleNetworkSwitch.mockImplementation(() => {
      // do nothing
    });

    mockNavigate.mockImplementation(() => {
      throw new Error('Unknown error');
    });

    handleEthereumUrl({ deeplinkManager, url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'send.network_not_found_title',
      'send.network_not_found_description',
    );
  });

  it('should navigate to SendFlowView for unknown function_name', () => {
    const url = 'ethereum:sign';
    const origin = 'test_origin';

    mockParse.mockReturnValue({
      function_name: 'unknown',
      chain_id: 1,
      parameters: {},
    });

    handleEthereumUrl({ deeplinkManager, url, origin });

    expect(deeplinkManager.navigation.navigate).toHaveBeenCalledWith(
      'SendFlowView',
      expect.any(Object),
    );
  });

  it('should handle a generic error during network switch', () => {
    const url = 'ethereum:sign';
    const origin = 'test_origin';
    const mockError = new Error('Generic network switch error');
    const spyAlert = jest.spyOn(Alert, 'alert');

    mockParse.mockReturnValue({
      function_name: 'unknown',
      chain_id: 1,
    });

    mockHandleNetworkSwitch.mockImplementation(() => {
      throw mockError;
    });

    handleEthereumUrl({ deeplinkManager, url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'send.network_not_found_title',
      'send.network_not_found_description',
    );
  });

  it('should handle an error in _approveTransaction for APPROVE action', () => {
    const url = 'ethereum:approve';
    const origin = 'test_origin';
    const mockError = new Error('Approval process failed');
    const spyAlert = jest.spyOn(Alert, 'alert');

    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.APPROVE,
      chain_id: 1,
      parameters: {},
    });

    mockApproveTransaction.mockImplementation(() => {
      throw mockError;
    });

    handleEthereumUrl({ deeplinkManager, url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'send.network_not_found_title',
      'send.network_not_found_description',
    );
  });

  it('should handle missing or incomplete parameters in URL for TRANSFER action', () => {
    const url = 'ethereum:transfer';
    const origin = 'test_origin';

    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
      parameters: {},
    });

    handleEthereumUrl({ deeplinkManager, url, origin });

    expect(deeplinkManager.navigation.navigate).toHaveBeenCalledWith(
      'SendView',
      expect.any(Object), // The exact expectations here depend on the intended behavior
    );
  });

  it('switch to mainnet when isEvmSelected is false', async () => {
    const url = 'ethereum:transfer';
    const origin = 'test_origin';
    const mockSetActiveNetwork = jest.fn();

    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
      parameters: {},
    });

    // Override the mock for this specific test
    const mockState = Engine.context.MultichainNetworkController.state as {
      isEvmSelected: boolean;
    };
    mockState.isEvmSelected = false;
    Engine.context.MultichainNetworkController.setActiveNetwork =
      mockSetActiveNetwork;

    await handleEthereumUrl({ deeplinkManager, url, origin });

    expect(mockSetActiveNetwork).toHaveBeenCalledWith(MAINNET);
  });
});
