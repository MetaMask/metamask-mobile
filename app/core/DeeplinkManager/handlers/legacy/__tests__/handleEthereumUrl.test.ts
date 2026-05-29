import { parse } from 'eth-url-parser';
import { Alert } from 'react-native';
import { ETH_ACTIONS } from '../../../../../constants/deeplinks';
import { NetworkSwitchErrorType } from '../../../../../constants/error';

import handleEthereumUrl from '../handleEthereumUrl';
import { getDecimalChainId } from '../../../../../util/networks';
import Engine from '../../../../Engine';
import { MAINNET } from '../../../../../constants/network';
import {
  addTransactionForDeeplink,
  isDeeplinkRedesignedConfirmationCompatible,
} from '../../../../../components/Views/confirmations/utils/deeplink';
import NavigationService from '../../../../NavigationService';
import handleApproveUrl from '../handleApproveUrl';
import switchNetwork from '../../../../../util/networks/switchNetwork';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('react-native');

jest.mock('../handleApproveUrl');

jest.mock('eth-url-parser', () => ({
  parse: jest.fn(),
}));

jest.mock('../../../../../util/networks', () => ({
  getDecimalChainId: jest.fn(),
}));

jest.mock('../../../../../util/networks/switchNetwork');

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../../../Engine', () => ({
  context: {
    MultichainNetworkController: {
      state: {
        isEvmSelected: true,
      },
      setActiveNetwork: jest.fn(),
    },
  },
}));

jest.mock('../../../../../components/Views/confirmations/utils/deeplink');

describe('handleEthereumUrl', () => {
  const mockParse = parse as jest.Mock;
  const mockGetDecimalChainId = getDecimalChainId as jest.Mock;
  const mockSwitchNetwork = switchNetwork as jest.Mock;
  const mockHandleApproveUrl = handleApproveUrl as jest.Mock;
  const mockIsDeeplinkRedesignedConfirmationCompatible = jest.mocked(
    isDeeplinkRedesignedConfirmationCompatible,
  );
  const mockAddTransactionForDeeplink = jest.mocked(addTransactionForDeeplink);

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset shared mock state mutated by other tests (e.g. the "switches to
    // mainnet" test sets isEvmSelected = false). jest.clearAllMocks() does not
    // restore plain object properties, so without this the handler would await
    // setActiveNetwork and navigate asynchronously, breaking unawaited tests.
    (
      Engine.context.MultichainNetworkController.state as {
        isEvmSelected: boolean;
      }
    ).isEvmSelected = true;

    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
    });

    mockSwitchNetwork.mockImplementation(() => {
      // do nothing
    });

    mockIsDeeplinkRedesignedConfirmationCompatible.mockReturnValue(false);
    mockAddTransactionForDeeplink.mockResolvedValue(
      {} as ReturnType<typeof addTransactionForDeeplink>,
    );
  });

  it('alerts and throws on invalid URL', () => {
    const spyAlert = jest.spyOn(Alert, 'alert');

    const url = 'invalid_url';
    const origin = 'test_origin';

    mockParse.mockImplementation(() => {
      throw new Error('Invalid URL');
    });

    handleEthereumUrl({ url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'deeplink.invalid',
      'Error: Invalid URL',
    );
  });

  it('shows deprecation modal if url is a goerli url', () => {
    const url = 'ethereum:transfer';
    const origin = 'test_origin';
    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 5,
    });

    mockGetDecimalChainId.mockReturnValue(5);

    handleEthereumUrl({ url, origin });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      'DeprecatedNetworkDetails',
      {},
    );
    expect(switchNetwork).toHaveBeenCalledTimes(0);
  });

  it('navigates to SendView for TRANSFER action', () => {
    const url = 'ethereum:transfer';
    const origin = 'test_origin';
    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
    });

    handleEthereumUrl({ url, origin });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith('Send', {
      screen: 'Recipient',
      params: {
        txMeta: expect.objectContaining({
          function_name: ETH_ACTIONS.TRANSFER,
          chain_id: 1,
          action: 'send-token',
          source: url,
        }),
      },
    });
  });

  it('shows alert when there is a network switch error', () => {
    const spyAlert = jest.spyOn(Alert, 'alert');

    const url = 'ethereum:transfer';
    const origin = 'test_origin';

    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
    });

    mockSwitchNetwork.mockImplementation(() => {
      throw new Error(NetworkSwitchErrorType.missingNetworkId);
    });

    handleEthereumUrl({ url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'send.network_not_found_title',
      'send.network_missing_id',
    );
  });

  it('calls _approveTransaction for APPROVE action', () => {
    const url = 'ethereum:approve';
    const origin = 'test_origin';
    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.APPROVE,
      chain_id: 1,
      parameters: {},
    });

    handleEthereumUrl({ url, origin });

    expect(handleApproveUrl).toHaveBeenCalledWith({
      ethUrl: expect.any(Object),
      origin,
    });
  });

  it('navigates to SendFlowView for default action', () => {
    const url = 'ethereum:unknownAction';
    const origin = 'test_origin';
    mockParse.mockReturnValue({
      function_name: 'unknownAction',
      chain_id: 1,
      parameters: {},
    });

    handleEthereumUrl({ url, origin });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith('Send', {
      screen: 'Recipient',
      params: {
        txMeta: expect.objectContaining({
          function_name: 'unknownAction',
          chain_id: 1,
          parameters: {},
          source: url,
        }),
      },
    });
  });

  it('calls addTransactionForDeeplink if deeplink is compatible with redesigned confirmation', () => {
    mockIsDeeplinkRedesignedConfirmationCompatible.mockReturnValue(true);
    const url = 'ethereum:transfer';
    const origin = 'test_origin';
    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
    });

    handleEthereumUrl({ url, origin });

    expect(mockIsDeeplinkRedesignedConfirmationCompatible).toHaveBeenCalledWith(
      ETH_ACTIONS.TRANSFER,
    );

    expect(
      mockIsDeeplinkRedesignedConfirmationCompatible,
    ).toHaveBeenCalledTimes(1);

    expect(mockAddTransactionForDeeplink).toHaveBeenCalledWith({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
      source: url,
      origin,
    });
  });

  it('shows alert when there is an unknown error during Ethereum URL handling', () => {
    const spyAlert = jest.spyOn(Alert, 'alert');

    const url = 'ethereum:transfer';
    const origin = 'test_origin';
    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
    });
    mockSwitchNetwork.mockImplementation(() => {
      // do nothing
    });

    (NavigationService.navigation.navigate as jest.Mock).mockImplementation(
      () => {
        throw new Error('Unknown error');
      },
    );

    handleEthereumUrl({ url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'send.network_not_found_title',
      'send.network_not_found_description',
    );
  });

  it('navigates to SendFlowView for unknown function_name', () => {
    const url = 'ethereum:sign';
    const origin = 'test_origin';

    mockParse.mockReturnValue({
      function_name: 'unknown',
      chain_id: 1,
      parameters: {},
    });

    handleEthereumUrl({ url, origin });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith('Send', {
      screen: 'Recipient',
      params: {
        txMeta: expect.objectContaining({
          function_name: 'unknown',
          chain_id: 1,
          parameters: {},
          source: url,
        }),
      },
    });
  });

  it('shows alert when there is a generic error during network switch', () => {
    const url = 'ethereum:sign';
    const origin = 'test_origin';
    const mockError = new Error('Generic network switch error');
    const spyAlert = jest.spyOn(Alert, 'alert');

    mockParse.mockReturnValue({
      function_name: 'unknown',
      chain_id: 1,
    });

    mockSwitchNetwork.mockImplementation(() => {
      throw mockError;
    });

    handleEthereumUrl({ url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'send.network_not_found_title',
      'send.network_not_found_description',
    );
  });

  it('shows an alert when approval process fails', () => {
    const url = 'ethereum:approve';
    const origin = 'test_origin';
    const mockError = new Error('Approval process failed');
    const spyAlert = jest.spyOn(Alert, 'alert');

    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.APPROVE,
      chain_id: 1,
      parameters: {},
    });

    mockHandleApproveUrl.mockImplementation(() => {
      throw mockError;
    });

    handleEthereumUrl({ url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'send.network_not_found_title',
      'send.network_not_found_description',
    );
  });

  it('shows alert when there are missing or incomplete parameters in URL for TRANSFER action', () => {
    const url = 'ethereum:transfer';
    const origin = 'test_origin';

    mockParse.mockReturnValue({
      function_name: ETH_ACTIONS.TRANSFER,
      chain_id: 1,
      parameters: {},
    });

    handleEthereumUrl({ url, origin });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith('Send', {
      screen: 'Recipient',
      params: {
        txMeta: expect.objectContaining({
          function_name: ETH_ACTIONS.TRANSFER,
          chain_id: 1,
          action: 'send-token',
          source: url,
        }),
      },
    });
  });

  it('switches to mainnet when isEvmSelected is false', async () => {
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

    await handleEthereumUrl({ url, origin });

    expect(mockSetActiveNetwork).toHaveBeenCalledWith(MAINNET);
  });

  // Regression tests for https://github.com/MetaMask/metamask-mobile/issues/23672
  // Large uint256 values from EIP-681 deeplinks (e.g. 1000 tokens with 18
  // decimals = 10^21) are returned by eth-url-parser in scientific notation
  // ("1e+21"). When forwarded unchanged, downstream BigNumber parsing throws
  // "invalid BigNumber string", which is swallowed and surfaced to the user as a
  // generic "Network not found" error.
  describe('large uint256 values in scientific notation (issue #23672)', () => {
    // The exact EIP-681 deeplink from the bug report: transfer of 1000 tokens
    // with 18 decimals (10^21) on Polygon (chain 137).
    const EIP681_URL =
      'ethereum:0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29@137/transfer?address=0xacdba8db799eff1e83b6aa95b493790f7a3df86b&uint256=1000000000000000000000';
    const SCIENTIFIC_NOTATION_REGEX = /e\+?\d+/i;

    it('documents the root cause: the real eth-url-parser emits scientific notation', () => {
      // Use the actual implementation rather than the module-level mock so we
      // capture eth-url-parser's real output for the bug-report URL.
      const { parse: realParse } = jest.requireActual('eth-url-parser');

      const parsed = realParse(EIP681_URL);

      // eth-url-parser collapses 10^21 to "1e+21" via bignumber.js toString().
      expect(parsed.parameters.uint256).toBe('1e+21');
    });

    it('forwards a decimal (non scientific-notation) uint256 to addTransactionForDeeplink', () => {
      const url = EIP681_URL;
      const origin = 'test_origin';

      // TRANSFER is always routed through addTransactionForDeeplink in practice.
      mockIsDeeplinkRedesignedConfirmationCompatible.mockReturnValue(true);

      // Mimic eth-url-parser returning the large value in scientific notation.
      mockParse.mockReturnValue({
        function_name: ETH_ACTIONS.TRANSFER,
        target_address: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',
        chain_id: '137',
        parameters: {
          address: '0xacdba8db799eff1e83b6aa95b493790f7a3df86b',
          uint256: '1e+21',
        },
      });

      handleEthereumUrl({ url, origin });

      expect(mockAddTransactionForDeeplink).toHaveBeenCalledTimes(1);

      const calledWith = mockAddTransactionForDeeplink.mock.calls[0][0];

      // The value forwarded downstream must be a plain decimal string so that
      // ethers/BigNumber can parse it. If it is still "1e+21", the bug persists
      // and this assertion fails.
      expect(calledWith.parameters.uint256).not.toMatch(SCIENTIFIC_NOTATION_REGEX);
      expect(calledWith.parameters.uint256).toBe('1000000000000000000000');
    });
  });
});
