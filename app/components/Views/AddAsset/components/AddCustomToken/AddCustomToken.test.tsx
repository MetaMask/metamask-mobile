import React from 'react';
import AddCustomToken from './AddCustomToken';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { act, fireEvent } from '@testing-library/react-native';
import { isSmartContractAddress } from '../../../../../util/transactions';
import Engine from '../../../../../core/Engine';
import { CaipAssetType } from '@metamask/utils';
import { toAssetId } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { selectIsAssetsUnifyStateEnabled } from '../../../../../selectors/featureFlagController/assetsUnifyState';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

const mockPush = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockAddCustomAsset = jest.fn();
const mockAddToken = jest.fn();
const mockSelectInternalAccountByScope = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
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
    TokensController: {
      addToken: jest.fn(),
    },
    AssetsController: {
      addCustomAsset: jest.fn(),
    },
  },
}));

jest.mock('../../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  toAssetId: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/assetsUnifyState',
  () => ({
    selectIsAssetsUnifyStateEnabled: jest.fn(),
  }),
);

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

const mockIsSmartContractAddress = isSmartContractAddress as jest.Mock;
const mockToAssetId = jest.mocked(toAssetId);
const mockSelectIsAssetsUnifyStateEnabled = jest.mocked(
  selectIsAssetsUnifyStateEnabled,
);

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890';
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
    mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(false);
    mockSelectInternalAccountByScope.mockReturnValue(null);
    mockToAssetId.mockReturnValue(MOCK_CAIP_ASSET);
    mockAddToken.mockResolvedValue(undefined);
    mockAddCustomAsset.mockResolvedValue(undefined);
    (Engine.context.TokensController.addToken as jest.Mock).mockResolvedValue(
      undefined,
    );
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

    const { getByTestId } = renderComponent();

    await act(async () => {
      fireEvent.changeText(
        getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
        VALID_ADDRESS,
      );
    });

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.ADDRESS_WARNING_MESSAGE),
    ).toBeOnTheScreen();
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

  describe('addToken', () => {
    it('calls TokensController.addToken with correct params', async () => {
      const utils = renderComponent();
      await setupAndPressNext(utils);

      const [, params] = mockPush.mock.calls[0];
      await act(async () => {
        await params.addTokenList();
      });

      expect(Engine.context.TokensController.addToken).toHaveBeenCalledWith(
        expect.objectContaining({
          address: VALID_ADDRESS,
          symbol: 'WBTC',
          decimals: 18,
        }),
      );
    });

    it('does not call AssetsController when isAssetsUnifyStateEnabled is false', async () => {
      mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(false);

      const utils = renderComponent();
      await setupAndPressNext(utils);

      const [, params] = mockPush.mock.calls[0];
      await act(async () => {
        await params.addTokenList();
      });

      expect(mockAddCustomAsset).not.toHaveBeenCalled();
    });

    it('calls AssetsController.addCustomAsset when isAssetsUnifyStateEnabled is true', async () => {
      mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(true);
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
      );
    });

    it('logs warning and still tracks analytics when no EVM account found', async () => {
      mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(true);
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

    it('logs error but still tracks analytics when addCustomAsset throws', async () => {
      mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(true);
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'evm-account-id',
        address: '0xabc',
      });
      mockAddCustomAsset.mockRejectedValue(new Error('contract error'));

      const utils = renderComponent();
      await setupAndPressNext(utils);

      const [, params] = mockPush.mock.calls[0];
      await act(async () => {
        await params.addTokenList();
      });

      expect(mockAddCustomAsset).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_ADDED,
      );
    });

    it('skips addCustomAsset when toAssetId returns undefined', async () => {
      mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(true);
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'evm-account-id',
        address: '0xabc',
      });
      mockToAssetId.mockReturnValue(undefined);

      const utils = renderComponent();
      await setupAndPressNext(utils);

      const [, params] = mockPush.mock.calls[0];
      await act(async () => {
        await params.addTokenList();
      });

      expect(mockAddCustomAsset).not.toHaveBeenCalled();
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
    });
  });
});
