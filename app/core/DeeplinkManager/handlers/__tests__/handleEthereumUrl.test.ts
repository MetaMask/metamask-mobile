import { getNativeTokenAddress } from '@metamask/assets-controllers';
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
import { handleSendPageNavigation } from '../../../../components/Views/confirmations/utils/send';
import { selectAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';

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
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
  },
}));

jest.mock('../../../redux', () => ({
  store: { getState: jest.fn(() => ({})) },
}));

jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectAssetsBySelectedAccountGroup: jest.fn(),
}));

jest.mock('../../../../components/Views/confirmations/utils/send', () => ({
  ...jest.requireActual(
    '../../../../components/Views/confirmations/utils/send',
  ),
  handleSendPageNavigation: jest.fn(),
}));

jest.mock('../handleSolanaUrl', () => ({
  mapDeeplinkOriginToInitSendLocation: jest.fn(() => 'Deeplink'),
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
        parameters: { uint256: '1' },
      }),
    );

    mockSwitchNetwork.mockImplementation(() => {
      // do nothing
    });

    mockIsDeeplinkRedesignedConfirmationCompatible.mockReturnValue(false);
    mockAddTransactionForDeeplink.mockResolvedValue(
      {} as ReturnType<typeof addTransactionForDeeplink>,
    );
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
        parameters: { uint256: '1' },
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
        parameters: { uint256: '1' },
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
      parameters: { uint256: '1' },
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
        parameters: { uint256: '1' },
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
        parameters: { uint256: '1' },
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

  // Regression tests for https://github.com/MetaMask/metamask-mobile/issues/37818
  describe('links without an amount', () => {
    const RECIPIENT = '0xacdba8db799eff1e83b6aa95b493790f7a3df86b';
    const USDC = '0xA0b86991c6218b36c1d19d4a2e9eB0cE3606eB48';
    const nativeEthAsset = {
      assetId: getNativeTokenAddress('0x1'),
      chainId: '0x1',
      symbol: 'ETH',
    };
    const usdcAsset = {
      assetId: USDC.toLowerCase(),
      chainId: '0x1',
      symbol: 'USDC',
    };

    const mockHandleSendPageNavigation = jest.mocked(handleSendPageNavigation);
    const mockSelectAssets = jest.mocked(selectAssetsBySelectedAccountGroup);
    const mockFindNetworkClientIdByChainId = jest.mocked(
      Engine.context.NetworkController.findNetworkClientIdByChainId,
    );

    beforeEach(() => {
      mockIsDeeplinkRedesignedConfirmationCompatible.mockReturnValue(true);
      mockFindNetworkClientIdByChainId.mockReturnValue('mainnet');
      mockSelectAssets.mockReturnValue({
        '0x1': [nativeEthAsset, usdcAsset],
      } as unknown as ReturnType<typeof selectAssetsBySelectedAccountGroup>);
    });

    it('opens the Send flow with native asset and recipient for a plain send without value', async () => {
      mockParse.mockReturnValue(
        parsedUrl({ target_address: RECIPIENT, chain_id: '1' }),
      );

      await handleEthereumUrl({
        url: `ethereum:${RECIPIENT}@1`,
        origin: 'test_origin',
      });

      expect(mockHandleSendPageNavigation).toHaveBeenCalledWith(mockNavigate, {
        location: 'Deeplink',
        asset: nativeEthAsset,
        predefinedRecipient: { address: RECIPIENT, chainType: 'evm' },
      });
      expect(mockAddTransactionForDeeplink).not.toHaveBeenCalled();
    });

    it('opens the Send flow with the token and recipient for a transfer without uint256', async () => {
      mockParse.mockReturnValue(
        parsedUrl({
          function_name: ETH_ACTIONS.TRANSFER,
          target_address: USDC,
          chain_id: '1',
          parameters: { address: RECIPIENT },
        }),
      );

      await handleEthereumUrl({
        url: `ethereum:${USDC}@1/transfer?address=${RECIPIENT}`,
        origin: 'test_origin',
      });

      expect(mockHandleSendPageNavigation).toHaveBeenCalledWith(mockNavigate, {
        location: 'Deeplink',
        asset: usdcAsset,
        predefinedRecipient: { address: RECIPIENT, chainType: 'evm' },
      });
      expect(mockAddTransactionForDeeplink).not.toHaveBeenCalled();
    });

    it('starts at asset selection when the account does not hold the token', async () => {
      mockSelectAssets.mockReturnValue({
        '0x1': [nativeEthAsset],
      } as unknown as ReturnType<typeof selectAssetsBySelectedAccountGroup>);
      mockParse.mockReturnValue(
        parsedUrl({
          function_name: ETH_ACTIONS.TRANSFER,
          target_address: USDC,
          chain_id: '1',
          parameters: { address: RECIPIENT },
        }),
      );

      await handleEthereumUrl({
        url: `ethereum:${USDC}@1/transfer?address=${RECIPIENT}`,
        origin: 'test_origin',
      });

      expect(mockHandleSendPageNavigation).toHaveBeenCalledWith(mockNavigate, {
        location: 'Deeplink',
        asset: undefined,
        predefinedRecipient: { address: RECIPIENT, chainType: 'evm' },
      });
    });

    it('falls back to mainnet when the link has no chain id', async () => {
      mockParse.mockReturnValue(parsedUrl({ target_address: RECIPIENT }));

      await handleEthereumUrl({
        url: `ethereum:${RECIPIENT}`,
        origin: 'test_origin',
      });

      expect(mockFindNetworkClientIdByChainId).toHaveBeenCalledWith('0x1');
      expect(mockHandleSendPageNavigation).toHaveBeenCalledWith(
        mockNavigate,
        expect.objectContaining({ asset: nativeEthAsset }),
      );
    });

    it('shows network not found alert when the chain is not in the wallet', async () => {
      const spyAlert = jest.spyOn(Alert, 'alert');
      mockFindNetworkClientIdByChainId.mockReturnValue(
        undefined as unknown as string,
      );
      mockParse.mockReturnValue(
        parsedUrl({ target_address: RECIPIENT, chain_id: '10' }),
      );

      await handleEthereumUrl({
        url: `ethereum:${RECIPIENT}@10`,
        origin: 'test_origin',
      });

      expect(spyAlert).toHaveBeenCalledWith(
        'send.network_not_found_title',
        'send.network_not_found_description',
      );
      expect(mockHandleSendPageNavigation).not.toHaveBeenCalled();
    });

    it('still builds the transaction when the link has an amount', async () => {
      mockParse.mockReturnValue(
        parsedUrl({
          target_address: RECIPIENT,
          chain_id: '1',
          parameters: { value: '1000' },
        }),
      );

      await handleEthereumUrl({
        url: `ethereum:${RECIPIENT}@1?value=1000`,
        origin: 'test_origin',
      });

      expect(mockAddTransactionForDeeplink).toHaveBeenCalled();
      expect(mockHandleSendPageNavigation).not.toHaveBeenCalled();
    });
  });
});
