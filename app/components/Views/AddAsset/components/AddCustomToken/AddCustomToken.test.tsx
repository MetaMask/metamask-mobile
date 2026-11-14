import React from 'react';
import { ActivityIndicator } from 'react-native';
import AddCustomToken from './AddCustomToken';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { act, fireEvent } from '@testing-library/react-native';
import { isSmartContractAddress } from '../../../../../util/transactions';
import Engine from '../../../../../core/Engine';
import { CaipAssetType } from '@metamask/utils';
import { toAssetId } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { getBlockExplorerAddressUrl } from '../../../../../util/networks';
import { TraceName, endTrace } from '../../../../../util/trace';

const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockAddCustomAsset = jest.fn();
const mockSelectInternalAccountByScope = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      push: mockPush,
      goBack: jest.fn(),
    }),
  };
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('../../../../../util/transactions', () => ({
  isSmartContractAddress: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AssetsContractController: {
      getERC20TokenDecimals: jest.fn().mockResolvedValue(18),
      getERC721AssetSymbol: jest.fn().mockResolvedValue('WBTC'),
      getERC20TokenName: jest.fn().mockResolvedValue('Wrapped Bitcoin'),
    },
    AssetsController: {
      addCustomAsset: jest.fn(),
    },
  },
}));

jest.mock('../../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  toAssetId: jest.fn(),
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: jest.fn(
    () => mockSelectInternalAccountByScope,
  ),
}));

jest.mock('../../../../../util/networks', () => ({
  getBlockExplorerAddressUrl: jest
    .fn()
    .mockReturnValue({ title: 'Etherscan', url: 'https://etherscan.io' }),
  getDecimalChainId: jest.fn().mockReturnValue('1'),
  isMainnetByChainId: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../../../util/trace', () => {
  const actual = jest.requireActual('../../../../../util/trace');
  return {
    ...actual,
    trace: jest.fn(),
    endTrace: jest.fn(),
  };
});

const mockIsSmartContractAddress = isSmartContractAddress as jest.Mock;
const mockGetBlockExplorerAddressUrl = getBlockExplorerAddressUrl as jest.Mock;
const mockToAssetId = jest.mocked(toAssetId);

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890';
const OTHER_VALID_ADDRESS = '0x1111111111111111111111111111111111111111';
const SHORT_ADDRESS = '0x12345';
const MOCK_CAIP_ASSET =
  'eip155:1/erc20:0x1234567890123456789012345678901234567890' as CaipAssetType;

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        useTokenDetection: true,
      },
    },
  },
};

const renderComponent = (props = {}) =>
  renderWithProvider(<AddCustomToken chainId="0x1" {...props} />, {
    state: mockInitialState,
  });

// Helper: render component, enter a valid contract address, and press Next
const setupAndPressNext = async (
  renderResult: ReturnType<typeof renderComponent>,
) => {
  mockIsSmartContractAddress.mockResolvedValue(true);
  await act(async () => {
    fireEvent.changeText(
      renderResult.getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
      VALID_ADDRESS,
    );
  });
  fireEvent.press(
    renderResult.getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON),
  );
};

describe('AddCustomToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    mockBuild.mockReturnValue({ event: 'mock-event' });
    mockSelectInternalAccountByScope.mockReturnValue(null);
    mockGetBlockExplorerAddressUrl.mockReturnValue({
      title: 'Etherscan',
      url: 'https://etherscan.io',
    });
    mockToAssetId.mockReturnValue(MOCK_CAIP_ASSET);
    mockAddCustomAsset.mockResolvedValue(undefined);
    (Engine.context.AssetsController.addCustomAsset as jest.Mock) =
      mockAddCustomAsset;
  });

  it('shows address error for an invalid address', () => {
    const { getByTestId } = renderComponent();

    fireEvent.changeText(
      getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
      SHORT_ADDRESS,
    );

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_WARNING_MESSAGE),
    ).toBeOnTheScreen();
  });

  it('shows address error when address is not a smart contract', async () => {
    mockIsSmartContractAddress.mockResolvedValue(false);

    const utils = renderComponent();

    await act(async () => {
      fireEvent.changeText(
        utils.getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        VALID_ADDRESS,
      );
    });

    expect(
      utils.getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_WARNING_MESSAGE),
    ).toBeOnTheScreen();
    expect(utils.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });

  it('clears the loading indicator when token metadata cannot be fetched', async () => {
    mockIsSmartContractAddress.mockResolvedValue(true);
    (
      Engine.context.AssetsContractController.getERC20TokenDecimals as jest.Mock
    ).mockRejectedValueOnce(new Error('rpc failed'));

    const utils = renderComponent();

    await act(async () => {
      fireEvent.changeText(
        utils.getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        VALID_ADDRESS,
      );
    });

    expect(
      utils.getByTestId(ImportTokenViewSelectorsIDs.SYMBOL_INPUT).props.value,
    ).toBe('');
    expect(utils.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });

  it('keeps the loading indicator up when an older lookup fails after the address changes', async () => {
    let rejectFirstLookup: (error: Error) => void = () => undefined;
    mockIsSmartContractAddress
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirstLookup = reject;
          }),
      )
      .mockImplementationOnce(() => new Promise(() => undefined));

    const utils = renderComponent();

    await act(async () => {
      fireEvent.changeText(
        utils.getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        VALID_ADDRESS,
      );
    });
    await act(async () => {
      fireEvent.changeText(
        utils.getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        OTHER_VALID_ADDRESS,
      );
    });
    await act(async () => {
      rejectFirstLookup(new Error('stale lookup'));
    });

    expect(utils.UNSAFE_queryByType(ActivityIndicator)).not.toBeNull();
  });

  it('does not apply metadata from a lookup that finished after the address changed', async () => {
    let resolveFirstLookup: (isContract: boolean) => void = () => undefined;
    mockIsSmartContractAddress
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstLookup = resolve;
          }),
      )
      .mockImplementationOnce(() => new Promise(() => undefined));

    const utils = renderComponent();

    await act(async () => {
      fireEvent.changeText(
        utils.getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        VALID_ADDRESS,
      );
    });
    await act(async () => {
      fireEvent.changeText(
        utils.getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        OTHER_VALID_ADDRESS,
      );
    });
    await act(async () => {
      resolveFirstLookup(true);
    });

    expect(
      Engine.context.AssetsContractController.getERC20TokenDecimals,
    ).not.toHaveBeenCalled();
    expect(utils.UNSAFE_queryByType(ActivityIndicator)).not.toBeNull();
  });

  it('fetches and displays token metadata for a valid contract address', async () => {
    mockIsSmartContractAddress.mockResolvedValue(true);

    const { getByTestId } = renderComponent();

    await act(async () => {
      fireEvent.changeText(
        getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        VALID_ADDRESS,
      );
    });

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SYMBOL_INPUT).props.value,
    ).toBe('WBTC');
    expect(
      getByTestId(ImportTokenViewSelectorsIDs.DECIMAL_INPUT).props.value,
    ).toBe('18');
  });

  it('hides symbol and decimals fields when address becomes invalid', async () => {
    mockIsSmartContractAddress.mockResolvedValue(true);

    const { getByTestId, queryByTestId } = renderComponent();

    await act(async () => {
      fireEvent.changeText(
        getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        VALID_ADDRESS,
      );
    });

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SYMBOL_INPUT),
    ).toBeOnTheScreen();

    await act(async () => {
      fireEvent.changeText(
        getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        SHORT_ADDRESS,
      );
    });

    expect(queryByTestId(ImportTokenViewSelectorsIDs.SYMBOL_INPUT)).toBeNull();
    expect(queryByTestId(ImportTokenViewSelectorsIDs.DECIMAL_INPUT)).toBeNull();
  });

  it('disables Next button when form is incomplete', () => {
    const { getByTestId } = renderComponent();

    const nextButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
    expect(nextButton).toBeDisabled();
  });

  it('navigates to ConfirmAddAsset when form is valid and Next is pressed', async () => {
    mockIsSmartContractAddress.mockResolvedValue(true);

    const { getByTestId } = renderComponent();

    await act(async () => {
      fireEvent.changeText(
        getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        VALID_ADDRESS,
      );
    });

    fireEvent.press(getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON));

    expect(mockPush).toHaveBeenCalledWith(
      'ConfirmAddAsset',
      expect.objectContaining({
        addTokenList: expect.any(Function),
        selectedAsset: expect.arrayContaining([
          expect.objectContaining({
            address: VALID_ADDRESS,
            symbol: 'WBTC',
            decimals: 18,
          }),
        ]),
      }),
    );
  });

  describe('block explorer link in the decimals warning', () => {
    // The warning only renders once the decimals field is both empty and
    // touched, so clear the auto-filled value and blur it.
    const showDecimalsWarning = async (
      renderResult: ReturnType<typeof renderComponent>,
    ) => {
      mockIsSmartContractAddress.mockResolvedValue(true);
      await act(async () => {
        fireEvent.changeText(
          renderResult.getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
          VALID_ADDRESS,
        );
      });

      const decimalsInput = renderResult.getByTestId(
        ImportTokenViewSelectorsIDs.DECIMAL_INPUT,
      );
      fireEvent.changeText(decimalsInput, '');
      fireEvent(decimalsInput, 'blur');
    };

    it('opens the block explorer for the token address', async () => {
      const utils = renderComponent();
      await showDecimalsWarning(utils);

      expect(
        utils.getByTestId(
          ImportTokenViewSelectorsIDs.PRECISION_WARNING_MESSAGE,
        ),
      ).toBeOnTheScreen();

      fireEvent.press(
        utils.getByTestId(
          ImportTokenViewSelectorsIDs.PRECISION_WARNING_EXPLORER_LINK,
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: { url: 'https://etherscan.io', title: 'Etherscan' },
      });
    });

    it('passes undefined when the network has no block explorer', async () => {
      mockGetBlockExplorerAddressUrl.mockReturnValue({
        title: null,
        url: null,
      });

      const utils = renderComponent();
      await showDecimalsWarning(utils);

      fireEvent.press(
        utils.getByTestId(
          ImportTokenViewSelectorsIDs.PRECISION_WARNING_EXPLORER_LINK,
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: { url: undefined, title: undefined },
      });
    });
  });

  describe('addToken', () => {
    it('calls AssetsController.addCustomAsset', async () => {
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'evm-account-id',
        address: '0xabc',
      });
      mockToAssetId.mockReturnValue(MOCK_CAIP_ASSET);

      const utils = renderComponent();
      await setupAndPressNext(utils);

      const [, params] = mockPush.mock.calls[0];
      await act(async () => {
        await params.addTokenList();
      });

      expect(mockAddCustomAsset).toHaveBeenCalledWith(
        'evm-account-id',
        MOCK_CAIP_ASSET,
        expect.objectContaining({ address: VALID_ADDRESS }),
      );
    });

    // `handleAddCustomAsset` (useAssetVisibility) silently no-ops when there is
    // no matching account, rather than throwing — a separate, pre-existing gap
    // outside this component. Documenting the current (imperfect) behavior here
    // rather than asserting on it as correct.
    it('still tracks analytics when no EVM account is found (handleAddCustomAsset no-ops)', async () => {
      mockSelectInternalAccountByScope.mockReturnValue(null);

      const utils = renderComponent();
      await setupAndPressNext(utils);

      const [, params] = mockPush.mock.calls[0];
      await act(async () => {
        await params.addTokenList();
      });

      expect(mockAddCustomAsset).not.toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_ADDED,
      );
    });

    it('rejects and does not track analytics or reset the form when addCustomAsset throws', async () => {
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'evm-account-id',
        address: '0xabc',
      });
      mockAddCustomAsset.mockRejectedValue(new Error('contract error'));

      const utils = renderComponent();
      await setupAndPressNext(utils);

      const [, params] = mockPush.mock.calls[0];
      await expect(params.addTokenList()).rejects.toThrow('contract error');

      expect(mockAddCustomAsset).toHaveBeenCalled();
      expect(endTrace).toHaveBeenCalledWith({
        name: TraceName.ImportTokens,
      });
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_ADDED,
      );
      // Address input should retain the entered value since the import failed.
      expect(
        utils.getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT).props
          .value,
      ).toBe(VALID_ADDRESS);
    });

    it('rejects and does not track analytics when toAssetId returns undefined', async () => {
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'evm-account-id',
        address: '0xabc',
      });
      mockToAssetId.mockReturnValue(undefined);

      const utils = renderComponent();
      await setupAndPressNext(utils);

      const [, params] = mockPush.mock.calls[0];
      await expect(params.addTokenList()).rejects.toThrow();

      expect(mockAddCustomAsset).not.toHaveBeenCalled();
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_ADDED,
      );
    });

    it('tracks TOKEN_ADDED analytics after successful token import', async () => {
      const utils = renderComponent();
      await setupAndPressNext(utils);

      const [, params] = mockPush.mock.calls[0];
      await act(async () => {
        await params.addTokenList();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_ADDED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(endTrace).toHaveBeenCalledWith({
        name: TraceName.ImportTokens,
      });
    });

    it('ends the import trace when the import rejects with undefined', async () => {
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'evm-account-id',
        address: '0xabc',
      });
      mockAddCustomAsset.mockRejectedValue(undefined);

      const utils = renderComponent();
      await setupAndPressNext(utils);

      const [, params] = mockPush.mock.calls[0];
      await expect(params.addTokenList()).rejects.toBeUndefined();
      expect(endTrace).toHaveBeenCalledWith({
        name: TraceName.ImportTokens,
      });
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_ADDED,
      );
    });
  });
});
