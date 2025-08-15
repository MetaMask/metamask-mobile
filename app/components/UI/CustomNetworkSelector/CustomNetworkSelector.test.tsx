import React from 'react';
import { render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseCaipChainId } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { useStyles } from '../../../component-library/hooks/useStyles';
import { isTestNet } from '../../../util/networks';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import CustomNetworkSelector from './CustomNetworkSelector';
import { CustomNetworkItem } from './CustomNetworkSelector.types';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  parseCaipChainId: jest.fn(),
}));

jest.mock('@metamask/controller-utils', () => ({
  toHex: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../../component-library/hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: {},
      addNetworkButtonContainer: {},
      iconContainer: {},
    },
    theme: {
      colors: {
        icon: {
          alternative: '#666666',
        },
        text: {
          alternative: '#999999',
        },
      },
    },
  })),
}));

jest.mock('../../../util/networks', () => ({
  isTestNet: jest.fn(),
}));

jest.mock('../../../constants/navigation/Routes', () => ({
  ADD_NETWORK: 'AddNetwork',
}));

jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: jest.fn(),
  NetworkType: {
    Custom: 'Custom',
  },
}));

jest.mock('../../hooks/useNetworkSelection/useNetworkSelection', () => ({
  useNetworkSelection: jest.fn(),
}));

jest.mock('../../../util/device', () => ({
  getDeviceHeight: jest.fn(() => 800),
  isAndroid: jest.fn(() => false),
  isIOS: jest.fn(() => true),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
  createProviderConfig: jest.fn(),
}));

jest.mock('../../../selectors/preferencesController', () => ({
  selectUseBlockieIcon: jest.fn(),
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

describe('CustomNetworkSelector', () => {
  const mockNavigate = jest.fn();
  const mockOpenModal = jest.fn();
  const mockUseSafeAreaInsets = useSafeAreaInsets as jest.MockedFunction<
    typeof useSafeAreaInsets
  >;
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
  const mockUseNetworkSelection = useNetworkSelection as jest.MockedFunction<
    typeof useNetworkSelection
  >;

  const mockNetworks: CustomNetworkItem[] = [
    {
      id: 'eip155:137',
      name: 'Polygon',
      caipChainId: 'eip155:137',
      networkTypeOrRpcUrl: 'https://polygon-rpc.com',
      isSelected: true,
      imageSource: { uri: 'polygon.png' },
    },
    {
      id: 'eip155:80001',
      name: 'Mumbai Testnet',
      caipChainId: 'eip155:80001',
      networkTypeOrRpcUrl: 'https://mumbai-rpc.com',
      isSelected: false,
      imageSource: { uri: 'mumbai.png' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    mockUseSafeAreaInsets.mockReturnValue({
      top: 0,
      right: 0,
      bottom: 34,
      left: 0,
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

    mockUseNetworkSelection.mockReturnValue({
      selectCustomNetwork: jest.fn(),
      selectPopularNetwork: jest.fn(),
      selectNetwork: jest.fn(),
      deselectAll: jest.fn(),
      toggleAll: jest.fn(),
      resetCustomNetworks: jest.fn(),
      customNetworksToReset: [],
    });
  });
  // TODO: Refactor tests - they aren't up to par
  describe('basic functionality', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(
        <CustomNetworkSelector openModal={mockOpenModal} />,
      );
      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });

    it('calls useNetworksByNamespace with correct parameters', () => {
      render(<CustomNetworkSelector openModal={mockOpenModal} />);

      expect(mockUseNetworksByNamespace).toHaveBeenCalledWith({
        networkType: NetworkType.Custom,
      });
    });

    it('calls useNetworkSelection with correct parameters', () => {
      render(<CustomNetworkSelector openModal={mockOpenModal} />);

      expect(mockUseNetworkSelection).toHaveBeenCalledWith({
        networks: mockNetworks,
      });
    });

    it('calls useSafeAreaInsets', () => {
      render(<CustomNetworkSelector openModal={mockOpenModal} />);

      expect(mockUseSafeAreaInsets).toHaveBeenCalled();
    });

    it('calls useStyles with theme colors', () => {
      render(<CustomNetworkSelector openModal={mockOpenModal} />);

      expect(mockUseStyles).toHaveBeenCalledWith(expect.any(Function), {
        colors: expect.objectContaining({
          icon: expect.any(Object),
          text: expect.any(Object),
        }),
      });
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
        <CustomNetworkSelector openModal={mockOpenModal} />,
      );

      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });
  });
});
