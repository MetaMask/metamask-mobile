import { parse, type ParseOutput } from 'eth-url-parser';
import { Alert } from 'react-native';
import { ETH_ACTIONS } from '../../../../constants/deeplinks';
import { NetworkSwitchErrorType } from '../../../../constants/error';

import handleEthereumUrl from '../handleEthereumUrl';
import { getDecimalChainId } from '../../../../util/networks';
import Engine from '../../../Engine';
import { MAINNET } from '../../../../constants/network';
import {
  addTransactionForDeeplink,
  isDeeplinkRedesignedConfirmationCompatible,
} from '../../../../components/Views/confirmations/utils/deeplink';
import NavigationService from '../../../NavigationService';
import handleApproveUrl from '../legacy/handleApproveUrl';
import switchNetwork from '../../../../util/networks/switchNetwork';
import AppConstants from '../../../AppConstants';
import NotificationManager from '../../../NotificationManager';
import { getPermittedAccounts } from '../../../Permissions';

jest.mock('../../../NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('../../../Permissions', () => ({
  getPermittedAccounts: jest.fn(),
}));

const MOCK_SELECTED_ADDRESS = '0xAbCdEf0000000000000000000000000000000001';

jest.mock('../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('react-native');

jest.mock('../legacy/handleApproveUrl');

jest.mock('eth-url-parser', () => ({
  parse: jest.fn(),
}));

jest.mock('../../../../util/networks', () => ({
  getDecimalChainId: jest.fn(),
}));

jest.mock('../../../../util/networks/switchNetwork');

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../../Engine', () => ({
  context: {
    MultichainNetworkController: {
      state: {
        isEvmSelected: true,
      },
      setActiveNetwork: jest.fn(),
    },
    AccountsController: {
      getSelectedAccount: jest.fn(() => ({ address: MOCK_SELECTED_ADDRESS })),
    },
    KeyringController: {
      isUnlocked: jest.fn(() => true),
    },
    NetworkController: {
      state: { selectedNetworkClientId: 'linea-mainnet' },
      getNetworkClientById: jest.fn(() => ({
        configuration: { chainId: '0xe708' },
      })),
    },
  },
}));

jest.mock('../../../../components/Views/confirmations/utils/deeplink');

describe('handleEthereumUrl', () => {
  const mockParse = jest.mocked(parse);
  const mockGetDecimalChainId = jest.mocked(getDecimalChainId);
  const mockSwitchNetwork = jest.mocked(switchNetwork);
  const mockHandleApproveUrl = jest.mocked(handleApproveUrl);
  const mockIsDeeplinkRedesignedConfirmationCompatible = jest.mocked(
    isDeeplinkRedesignedConfirmationCompatible,
  );
  const mockAddTransactionForDeeplink = jest.mocked(addTransactionForDeeplink);
  const mockNavigate = jest.mocked(NavigationService.navigation.navigate);
  const mockGetPermittedAccounts = jest.mocked(getPermittedAccounts);
  const mockShowSimpleNotification = jest.mocked(
    NotificationManager.showSimpleNotification,
  );
  const parsedUrl = (value: object) => value as ParseOutput;

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
    Engine.context.MultichainNetworkController.setActiveNetwork = jest.fn();

    mockParse.mockReturnValue(
      parsedUrl({
        function_name: ETH_ACTIONS.TRANSFER,
        chain_id: 1,
      }),
    );

    mockSwitchNetwork.mockImplementation(() => {
      // do nothing
    });

    mockIsDeeplinkRedesignedConfirmationCompatible.mockReturnValue(false);
    mockAddTransactionForDeeplink.mockResolvedValue(
      {} as ReturnType<typeof addTransactionForDeeplink>,
    );
    jest
      .mocked(Engine.context.AccountsController.getSelectedAccount)
      .mockReturnValue({ address: MOCK_SELECTED_ADDRESS } as ReturnType<
        typeof Engine.context.AccountsController.getSelectedAccount
      >);
    mockGetPermittedAccounts.mockReturnValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    mockParse.mockReturnValue(
      parsedUrl({
        function_name: ETH_ACTIONS.TRANSFER,
        chain_id: 5,
      }),
    );

    mockGetDecimalChainId.mockReturnValue(5);

    handleEthereumUrl({ url, origin });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      'DeprecatedNetworkDetails',
      {},
    );
    expect(switchNetwork).toHaveBeenCalledTimes(0);
  });

  it('shows alert when there is a network switch error', () => {
    const spyAlert = jest.spyOn(Alert, 'alert');

    const url = 'ethereum:transfer';
    const origin = 'test_origin';

    mockParse.mockReturnValue(
      parsedUrl({
        function_name: ETH_ACTIONS.TRANSFER,
        chain_id: 1,
      }),
    );

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
    mockParse.mockReturnValue(
      parsedUrl({
        function_name: ETH_ACTIONS.APPROVE,
        chain_id: 1,
        parameters: {},
      }),
    );

    handleEthereumUrl({ url, origin });

    expect(handleApproveUrl).toHaveBeenCalledWith({
      ethUrl: expect.any(Object),
      origin,
    });
  });

  it('navigates to SendFlowView for default action', () => {
    const url = 'ethereum:unknownAction';
    const origin = 'test_origin';
    mockParse.mockReturnValue(
      parsedUrl({
        function_name: 'unknownAction',
        chain_id: 1,
        parameters: {},
      }),
    );

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
    mockParse.mockReturnValue(
      parsedUrl({
        function_name: ETH_ACTIONS.TRANSFER,
        chain_id: 1,
      }),
    );

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

  it('shows network not found alert when redesigned send cannot resolve chain', async () => {
    const spyAlert = jest.spyOn(Alert, 'alert');
    const url = 'ethereum:transfer';
    const origin = 'test_origin';

    mockIsDeeplinkRedesignedConfirmationCompatible.mockReturnValue(true);
    mockAddTransactionForDeeplink.mockRejectedValue(
      new Error('Unable to find network with chain id 0xa'),
    );
    mockParse.mockReturnValue(
      parsedUrl({
        function_name: ETH_ACTIONS.TRANSFER,
        chain_id: 10,
      }),
    );

    await handleEthereumUrl({ url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'send.network_not_found_title',
      'send.network_not_found_description',
    );
    expect(NavigationService.navigation.navigate).not.toHaveBeenCalled();
  });

  it('shows alert when there is an unknown error during Ethereum URL handling', () => {
    const spyAlert = jest.spyOn(Alert, 'alert');

    const url = 'ethereum:transfer';
    const origin = 'test_origin';
    mockParse.mockReturnValue(
      parsedUrl({
        function_name: ETH_ACTIONS.TRANSFER,
        chain_id: 1,
      }),
    );
    mockSwitchNetwork.mockImplementation(() => {
      // do nothing
    });

    mockNavigate.mockImplementation(() => {
      throw new Error('Unknown error');
    });

    handleEthereumUrl({ url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'send.network_not_found_title',
      'send.network_not_found_description',
    );
  });

  it('navigates to SendFlowView for unknown function_name', () => {
    const url = 'ethereum:sign';
    const origin = 'test_origin';

    mockParse.mockReturnValue(
      parsedUrl({
        function_name: 'unknown',
        chain_id: 1,
        parameters: {},
      }),
    );

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

    mockParse.mockReturnValue(
      parsedUrl({
        function_name: 'unknown',
        chain_id: 1,
      }),
    );

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

    mockParse.mockReturnValue(
      parsedUrl({
        function_name: ETH_ACTIONS.APPROVE,
        chain_id: 1,
        parameters: {},
      }),
    );

    mockHandleApproveUrl.mockImplementation(() => {
      throw mockError;
    });

    handleEthereumUrl({ url, origin });

    expect(spyAlert).toHaveBeenCalledWith(
      'send.network_not_found_title',
      'send.network_not_found_description',
    );
  });

  it('switches to mainnet when isEvmSelected is false', async () => {
    const url = 'ethereum:transfer';
    const origin = 'test_origin';
    const mockSetActiveNetwork = jest.fn();

    mockParse.mockReturnValue(
      parsedUrl({
        function_name: ETH_ACTIONS.TRANSFER,
        chain_id: 1,
        parameters: {},
      }),
    );

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

  // Regression test for https://github.com/MetaMask/metamask-mobile/issues/23672
  it('sanitizes scientific notation uint256 before forwarding to addTransactionForDeeplink', () => {
    mockIsDeeplinkRedesignedConfirmationCompatible.mockReturnValue(true);
    mockParse.mockReturnValue(
      parsedUrl({
        function_name: ETH_ACTIONS.TRANSFER,
        target_address: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',
        chain_id: '137',
        parameters: {
          address: '0xacdba8db799eff1e83b6aa95b493790f7a3df86b',
          uint256: '1e+21',
        },
      }),
    );

    handleEthereumUrl({ url: 'ethereum:transfer', origin: 'test_origin' });

    const forwardedUint256 =
      mockAddTransactionForDeeplink.mock.calls[0][0].parameters?.uint256;
    expect(forwardedUint256).toBe('1000000000000000000000');
  });

  describe('in-app browser origins', () => {
    const pageOrigin = 'https://dapp.example';

    beforeEach(() => {
      mockIsDeeplinkRedesignedConfirmationCompatible.mockReturnValue(true);
    });

    it.each([
      { name: 'a page that is not connected', origin: pageOrigin },
      {
        name: 'a request the browser could not attribute to a page',
        origin: AppConstants.DEEPLINKS.ORIGIN_IN_APP_BROWSER,
      },
    ])('rejects a transaction from $name', async ({ origin }) => {
      await handleEthereumUrl({ url: 'ethereum:transfer', origin });

      expect(mockAddTransactionForDeeplink).not.toHaveBeenCalled();
      expect(mockSwitchNetwork).not.toHaveBeenCalled();
      expect(mockShowSimpleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'simple_notification_rejected',
          title: 'deeplink.site_not_connected_title',
          description: 'deeplink.site_not_connected_description',
        }),
      );
    });

    it('rejects a transaction when the page is connected to a different account', async () => {
      mockGetPermittedAccounts.mockReturnValue([
        '0x0000000000000000000000000000000000000002',
      ]);

      await handleEthereumUrl({ url: 'ethereum:transfer', origin: pageOrigin });

      expect(mockGetPermittedAccounts).toHaveBeenCalledWith(pageOrigin, {
        scope: 'eip155:1',
      });
      expect(mockAddTransactionForDeeplink).not.toHaveBeenCalled();
      expect(mockShowSimpleNotification).toHaveBeenCalled();
    });

    it.each([
      {
        name: 'the chain in the link',
        ethUrl: { function_name: ETH_ACTIONS.TRANSFER, chain_id: '137' },
        isRedesigned: true,
        scope: 'eip155:137',
      },
      {
        name: 'mainnet when a redesigned request has no chain',
        ethUrl: { function_name: ETH_ACTIONS.TRANSFER },
        isRedesigned: true,
        scope: 'eip155:1',
      },
      {
        name: 'the selected network when a legacy request has no chain',
        ethUrl: { function_name: ETH_ACTIONS.APPROVE },
        isRedesigned: false,
        scope: 'eip155:59144',
      },
    ])(
      'checks permitted accounts on $name',
      async ({ ethUrl, isRedesigned, scope }) => {
        mockIsDeeplinkRedesignedConfirmationCompatible.mockReturnValue(
          isRedesigned,
        );
        mockParse.mockReturnValue(parsedUrl(ethUrl));

        await handleEthereumUrl({ url: 'ethereum:x', origin: pageOrigin });

        expect(mockGetPermittedAccounts).toHaveBeenCalledWith(pageOrigin, {
          scope,
        });
      },
    );

    it('ignores the request without a notification while the wallet is locked', async () => {
      jest
        .mocked(Engine.context.KeyringController.isUnlocked)
        .mockReturnValueOnce(false);

      await handleEthereumUrl({ url: 'ethereum:transfer', origin: pageOrigin });

      expect(mockGetPermittedAccounts).not.toHaveBeenCalled();
      expect(mockAddTransactionForDeeplink).not.toHaveBeenCalled();
      expect(mockShowSimpleNotification).not.toHaveBeenCalled();
    });

    it('rejects an approval from a page that is not connected', async () => {
      mockIsDeeplinkRedesignedConfirmationCompatible.mockReturnValue(false);
      mockParse.mockReturnValue(
        parsedUrl({ function_name: ETH_ACTIONS.APPROVE, chain_id: 1 }),
      );

      await handleEthereumUrl({ url: 'ethereum:approve', origin: pageOrigin });

      expect(mockHandleApproveUrl).not.toHaveBeenCalled();
      expect(mockShowSimpleNotification).toHaveBeenCalled();
    });

    it('adds the transaction when the page is connected to the selected account', async () => {
      mockGetPermittedAccounts.mockReturnValue([
        MOCK_SELECTED_ADDRESS.toLowerCase(),
      ]);

      await handleEthereumUrl({ url: 'ethereum:transfer', origin: pageOrigin });

      expect(mockAddTransactionForDeeplink).toHaveBeenCalledWith(
        expect.objectContaining({ origin: pageOrigin }),
      );
      expect(mockShowSimpleNotification).not.toHaveBeenCalled();
    });

    it.each([
      AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
    ])('does not require a connection for origin %s', async (origin) => {
      await handleEthereumUrl({ url: 'ethereum:transfer', origin });

      expect(mockGetPermittedAccounts).not.toHaveBeenCalled();
      expect(mockAddTransactionForDeeplink).toHaveBeenCalledWith(
        expect.objectContaining({ origin }),
      );
    });
  });
});
