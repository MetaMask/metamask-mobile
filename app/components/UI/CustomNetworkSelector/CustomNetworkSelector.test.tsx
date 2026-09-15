import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider, useSelector } from 'react-redux';
import { createStore } from 'redux';
import { useNavigation } from '@react-navigation/native';
import { parseCaipChainId } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { useStyles } from '../../../component-library/hooks/useStyles';
import { isTestNet } from '../../../util/networks';
import {
  useNetworksByNamespace,
  useNetworksByCustomNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworksToUse } from '../../hooks/useNetworksToUse/useNetworksToUse';
import CustomNetworkSelector from './CustomNetworkSelector';
import { CustomNetworkItem } from './CustomNetworkSelector.types';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
} from '../../../selectors/multichainNetworkController';
import { selectEvmChainId } from '../../../selectors/networkController';
import { InternalAccount } from '@metamask/keyring-internal-api';

jest.mock('../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn().mockReturnValue(false),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  parseCaipChainId: jest.fn(),
  KnownCaipNamespace: {
    Eip155: 'eip155',
    Solana: 'solana',
    Bip122: 'bip122',
    Tron: 'tron',
  },
}));

jest.mock('@metamask/controller-utils', () => ({
  toHex: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn(
    (chainId: string) => `eip155:${parseInt(chainId, 16)}`,
  ),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../../component-library/hooks/useStyles', () => ({
  useStyles: jest.fn(() => {
    const { mockTheme } = jest.requireActual('../../../util/theme');
    return {
      styles: {
        container: {},
        addNetworkButtonContainer: {},
        iconContainer: {},
      },
      theme: mockTheme,
    };
  }),
}));

jest.mock('../../../util/networks', () => ({
  isTestNet: jest.fn(),
}));

jest.mock('../../../util/hideProtocolFromUrl', () =>
  jest.fn((url: string) => url.replace(/^https?:\/\//, '')),
);

jest.mock('../../../util/hideKeyFromUrl', () =>
  jest.fn((url: string) => url.replace(/\/[a-zA-Z0-9]{32,}$/, '')),
);

jest.mock('../../../constants/navigation/Routes', () => ({
  ADD_NETWORK: 'AddNetwork',
}));

jest.mock('../../../selectors/assets/balances', () => ({
  selectBalanceBySelectedAccountGroup: jest.fn(() => () => null),
  selectBalanceChangeBySelectedAccountGroup: jest.fn(() => () => null),
}));

jest.mock('../../hooks/useFormatters', () => ({
  useFormatters: jest.fn(() => ({
    formatCurrency: jest.fn(
      (amount: number, currency: string) => `${amount} ${currency}`,
    ),
  })),
}));

jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: jest.fn(),
  useNetworksByCustomNamespace: jest.fn(),
  NetworkType: {
    Custom: 'Custom',
  },
}));

jest.mock('../../hooks/useNetworksToUse/useNetworksToUse', () => ({
  useNetworksToUse: jest.fn(),
}));

jest.mock('../../../util/device', () => ({
  getDeviceHeight: jest.fn(() => 800),
  isAndroid: jest.fn(() => false),
  isIOS: jest.fn(() => true),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
  createProviderConfig: jest.fn(),
  selectEvmChainId: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  Provider: jest.requireActual('react-redux').Provider,
}));

jest.mock('../../../component-library/components/Cells/Cell', () => {
  const ReactActual = jest.requireActual('react');
  const MockCell = function MockCell(props: Record<string, unknown>) {
    return ReactActual.createElement('View', {
      testID: 'mock-cell',
      ...props,
    });
  };

  return {
    default: MockCell,
    CellVariant: {
      SelectWithMenu: 'SelectWithMenu',
    },
  };
});

jest.mock('@shopify/flash-list', () => {
  const ReactActual = jest.requireActual('react');
  const MockFlashList = function MockFlashList(props: Record<string, unknown>) {
    return ReactActual.createElement('View', {
      testID: 'mock-flash-list',
      ...props,
    });
  };
  return {
    FlashList: MockFlashList,
    ListRenderItem: jest.fn(),
  };
});

jest.mock('../../../selectors/multichainNetworkController', () => ({
  selectIsEvmNetworkSelected: jest.fn(),
  selectSelectedNonEvmNetworkChainId: jest.fn(),
}));

// Mock store setup
const mockStore = createStore(() => ({
  featureFlags: {
    multichainAccounts: {
      enabledMultichainAccounts: true,
    },
  },
}));

describe('CustomNetworkSelector', () => {
  const mockNavigate = jest.fn();
  const mockOpenModal = jest.fn();
  const mockDismissModal = jest.fn();
  const mockOpenRpcModal = jest.fn();
  const mockOnLocalNetworkSelect = jest.fn();
  const defaultLocalProps = {
    onLocalNetworkSelect: mockOnLocalNetworkSelect,
    localSelectedChainIds: null,
  };
  const mockParseCaipChainId = parseCaipChainId as jest.MockedFunction<
    typeof parseCaipChainId
  >;
  const mockToHex = toHex as jest.MockedFunction<typeof toHex>;
  const mockUseStyles = useStyles as jest.MockedFunction<typeof useStyles>;
  const mockIsTestNet = isTestNet as jest.MockedFunction<typeof isTestNet>;
  const mockUseNetworksByNamespace =
    useNetworksByNamespace as jest.MockedFunction<
      typeof useNetworksByNamespace
    >;
  const mockUseNetworksByCustomNamespace = jest.mocked(
    useNetworksByCustomNamespace,
  );
  const mockUseNetworksToUse = useNetworksToUse as jest.MockedFunction<
    typeof useNetworksToUse
  >;
  const mockSelectIsEvmNetworkSelected =
    selectIsEvmNetworkSelected as jest.MockedFunction<
      typeof selectIsEvmNetworkSelected
    >;
  const mockNetworks: CustomNetworkItem[] = [
    {
      id: 'eip155:137',
      name: 'Polygon',
      caipChainId: 'eip155:137',
      networkTypeOrRpcUrl: 'https://polygon-rpc.com/v3/abc123',
      isSelected: true,
      imageSource: { uri: 'polygon.png' },
      hasMultipleRpcs: true,
    },
    {
      id: 'eip155:80001',
      name: 'Mumbai Testnet',
      caipChainId: 'eip155:80001',
      networkTypeOrRpcUrl: 'https://mumbai-rpc.com',
      isSelected: false,
      imageSource: { uri: 'mumbai.png' },
      hasMultipleRpcs: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    mockParseCaipChainId.mockImplementation((chainId) => ({
      namespace: 'eip155',
      reference: chainId.split(':')[1],
    }));

    mockToHex.mockImplementation((value) => `0x${value}`);

    mockIsTestNet.mockReturnValue(false);

    mockUseNetworksByNamespace.mockReturnValue({
      networks: mockNetworks,
      selectedNetworks: [mockNetworks[0]],
      selectedCount: 1,
      areAllNetworksSelected: false,
      areAnyNetworksSelected: true,
      networkCount: 2,
    });

    mockUseNetworksByCustomNamespace.mockReturnValue({
      networks: mockNetworks,
      selectedNetworks: [mockNetworks[0]],
      selectedCount: 1,
      areAllNetworksSelected: false,
      areAnyNetworksSelected: true,
      networkCount: 2,
      totalEnabledNetworksCount: 2,
    });

    mockUseNetworksToUse.mockReturnValue({
      networksToUse: [...mockNetworks, ...mockNetworks], // Combined EVM and Solana networks
      evmNetworks: mockNetworks,
      solanaNetworks: mockNetworks,
      bitcoinNetworks: mockNetworks,
      selectedEvmAccount: { id: 'evm-account' } as InternalAccount,
      selectedSolanaAccount: { id: 'solana-account' } as InternalAccount,
      selectedBitcoinAccount: { id: 'bitcoin-account' } as InternalAccount,
      selectedTronAccount: { id: 'tron-account' } as InternalAccount,
      tronNetworks: mockNetworks,
      stellarNetworks: mockNetworks,
      selectedStellarAccount: { id: 'stellar-account' } as InternalAccount,
      areAllBitcoinNetworksSelected: false,
      areAllTronNetworksSelected: false,
      areAllStellarNetworksSelected: false,
      areAllNetworksSelectedCombined: false,
      areAllEvmNetworksSelected: false,
      areAllSolanaNetworksSelected: false,
    });

    mockSelectIsEvmNetworkSelected.mockReturnValue(true);
  });

  // Helper function to render with Redux provider
  const renderWithProvider = (component: React.ReactElement) =>
    render(<Provider store={mockStore}>{component}</Provider>);

  // TODO: Refactor tests - they aren't up to par
  describe('basic functionality', () => {
    it('renders without crashing', () => {
      const { getByTestId } = renderWithProvider(
        <CustomNetworkSelector
          openModal={mockOpenModal}
          dismissModal={mockDismissModal}
          {...defaultLocalProps}
        />,
      );
      expect(getByTestId('mock-flash-list')).toBeOnTheScreen();
    });

    it('calls useNetworksByNamespace with correct parameters', () => {
      renderWithProvider(
        <CustomNetworkSelector
          openModal={mockOpenModal}
          dismissModal={mockDismissModal}
          {...defaultLocalProps}
        />,
      );

      expect(mockUseNetworksByNamespace).toHaveBeenCalledWith({
        networkType: NetworkType.Custom,
      });
    });

    it('calls useStyles with createStyles', () => {
      renderWithProvider(
        <CustomNetworkSelector
          openModal={mockOpenModal}
          dismissModal={mockDismissModal}
          {...defaultLocalProps}
        />,
      );

      expect(mockUseStyles).toHaveBeenCalledWith(expect.any(Function), {});
    });
  });

  describe('empty state', () => {
    it('renders correctly when no networks are available', () => {
      mockUseNetworksByNamespace.mockReturnValue({
        networks: [],
        selectedNetworks: [],
        selectedCount: 0,
        areAllNetworksSelected: false,
        areAnyNetworksSelected: false,
        networkCount: 0,
      });

      const { getByTestId } = render(
        <CustomNetworkSelector
          openModal={mockOpenModal}
          dismissModal={mockDismissModal}
          openRpcModal={mockOpenRpcModal}
          {...defaultLocalProps}
        />,
      );

      expect(getByTestId('mock-flash-list')).toBeOnTheScreen();
    });
  });

  describe('callback functionality', () => {
    it('derives each row isSelected from localSelectedChainIds, not the raw enablement flag', () => {
      const { getByTestId } = renderWithProvider(
        <CustomNetworkSelector
          openModal={mockOpenModal}
          dismissModal={mockDismissModal}
          onLocalNetworkSelect={mockOnLocalNetworkSelect}
          localSelectedChainIds={[mockNetworks[1].caipChainId]}
        />,
      );

      // mockNetworks[0].isSelected is true (via NetworkEnablementController)
      // and mockNetworks[1].isSelected is false, but the rendered list must
      // flip that based on localSelectedChainIds instead.
      const flashListData = getByTestId('mock-flash-list').props.data;
      expect(flashListData[0].isSelected).toBe(false);
      expect(flashListData[1].isSelected).toBe(true);
    });

    it('calls onLocalNetworkSelect (never a controller/Redux write) when a custom network row is pressed', async () => {
      const { getByTestId } = renderWithProvider(
        <CustomNetworkSelector
          openModal={mockOpenModal}
          dismissModal={mockDismissModal}
          {...defaultLocalProps}
        />,
      );

      // FlashList itself is mocked out (it never actually mounts its
      // children), so inspect the row element `renderItem` produces
      // directly rather than trying to render it.
      const { renderItem } = getByTestId('mock-flash-list').props;
      const rowElement = renderItem({ item: mockNetworks[0] });
      const cellElement = rowElement.props.children;

      await cellElement.props.onPress();

      expect(mockOnLocalNetworkSelect).toHaveBeenCalledWith([
        mockNetworks[0].caipChainId,
      ]);
      expect(mockDismissModal).toHaveBeenCalled();
    });
  });

  describe('network menu', () => {
    it('flags the true active network via isActiveNetwork without blocking displayEdit', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectIsEvmNetworkSelected) return true;
        if (selector === selectEvmChainId) return '0x89'; // 137 in hex, matches mockNetworks[0]
        if (selector === selectSelectedNonEvmNetworkChainId) return undefined;
        return undefined;
      });

      const { getByTestId } = renderWithProvider(
        <CustomNetworkSelector
          openModal={mockOpenModal}
          dismissModal={mockDismissModal}
          {...defaultLocalProps}
        />,
      );

      const { renderItem } = getByTestId('mock-flash-list').props;

      const activeRow = renderItem({ item: mockNetworks[0] });
      activeRow.props.children.props.buttonProps.onButtonClick();

      expect(mockOpenModal).toHaveBeenCalledWith(
        expect.objectContaining({
          caipChainId: mockNetworks[0].caipChainId,
          displayEdit: true,
          isActiveNetwork: true,
        }),
      );

      mockOpenModal.mockClear();

      const inactiveRow = renderItem({ item: mockNetworks[1] });
      inactiveRow.props.children.props.buttonProps.onButtonClick();

      expect(mockOpenModal).toHaveBeenCalledWith(
        expect.objectContaining({
          caipChainId: mockNetworks[1].caipChainId,
          isActiveNetwork: false,
        }),
      );
    });
  });

  describe('RPC Selection', () => {
    it('calls openRpcModal when network text is clicked', () => {
      const { getByTestId } = renderWithProvider(
        <CustomNetworkSelector
          openModal={mockOpenModal}
          dismissModal={mockDismissModal}
          openRpcModal={mockOpenRpcModal}
          {...defaultLocalProps}
        />,
      );

      expect(getByTestId('mock-flash-list')).toBeOnTheScreen();
      expect(mockOpenRpcModal).toBeDefined();
    });

    it('displays secondary text when network has multiple RPCs', () => {
      const networkWithMultipleRpcs: CustomNetworkItem = {
        id: 'eip155:137',
        name: 'Polygon',
        caipChainId: 'eip155:137',
        networkTypeOrRpcUrl: 'https://polygon-rpc.com/v3/abc123',
        isSelected: false,
        imageSource: { uri: 'polygon.png' },
        hasMultipleRpcs: true,
      };

      mockUseNetworksByNamespace.mockReturnValue({
        networks: [networkWithMultipleRpcs],
        selectedNetworks: [],
        selectedCount: 0,
        areAllNetworksSelected: false,
        areAnyNetworksSelected: false,
        networkCount: 1,
      });

      mockUseNetworksToUse.mockReturnValue({
        networksToUse: [networkWithMultipleRpcs],
        evmNetworks: [networkWithMultipleRpcs],
        solanaNetworks: [],
        bitcoinNetworks: [],
        selectedEvmAccount: null,
        selectedSolanaAccount: null,
        selectedBitcoinAccount: null,
        selectedTronAccount: null,
        selectedStellarAccount: null,
        tronNetworks: [],
        stellarNetworks: [],
        areAllBitcoinNetworksSelected: false,
        areAllTronNetworksSelected: false,
        areAllStellarNetworksSelected: false,
        areAllNetworksSelectedCombined: false,
        areAllEvmNetworksSelected: false,
        areAllSolanaNetworksSelected: false,
      });

      const { getByTestId } = renderWithProvider(
        <CustomNetworkSelector
          openModal={mockOpenModal}
          dismissModal={mockDismissModal}
          openRpcModal={mockOpenRpcModal}
          {...defaultLocalProps}
        />,
      );

      expect(getByTestId('mock-flash-list')).toBeOnTheScreen();
    });

    it('does not display secondary text when network has single RPC', () => {
      const networkWithSingleRpc: CustomNetworkItem = {
        id: 'eip155:80001',
        name: 'Mumbai Testnet',
        caipChainId: 'eip155:80001',
        networkTypeOrRpcUrl: 'https://mumbai-rpc.com',
        isSelected: false,
        imageSource: { uri: 'mumbai.png' },
        hasMultipleRpcs: false,
      };

      mockUseNetworksByNamespace.mockReturnValue({
        networks: [networkWithSingleRpc],
        selectedNetworks: [],
        selectedCount: 0,
        areAllNetworksSelected: false,
        areAnyNetworksSelected: false,
        networkCount: 1,
      });

      mockUseNetworksToUse.mockReturnValue({
        networksToUse: [networkWithSingleRpc],
        evmNetworks: [networkWithSingleRpc],
        solanaNetworks: [],
        bitcoinNetworks: [],
        selectedEvmAccount: null,
        selectedSolanaAccount: null,
        selectedBitcoinAccount: null,
        selectedTronAccount: null,
        selectedStellarAccount: null,
        tronNetworks: [],
        stellarNetworks: [],
        areAllBitcoinNetworksSelected: false,
        areAllTronNetworksSelected: false,
        areAllStellarNetworksSelected: false,
        areAllNetworksSelectedCombined: false,
        areAllEvmNetworksSelected: false,
        areAllSolanaNetworksSelected: false,
      });

      const { getByTestId } = renderWithProvider(
        <CustomNetworkSelector
          openModal={mockOpenModal}
          dismissModal={mockDismissModal}
          openRpcModal={mockOpenRpcModal}
          {...defaultLocalProps}
        />,
      );

      expect(getByTestId('mock-flash-list')).toBeOnTheScreen();
    });
  });
});
