import React from 'react';
import NetworkModal from './index';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { selectUseSafeChainsListValidation } from '../../../selectors/preferencesController';
import { NetworkApprovalBottomSheetSelectorsIDs } from '../../../../e2e/selectors/Network/NetworkApprovalBottomSheet.selectors';
import { NetworkAddedBottomSheetSelectorsIDs } from '../../../../e2e/selectors/Network/NetworkAddedBottomSheet.selectors';
import { selectNetworkConfigurations } from '../../../selectors/networkController';

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isPrivateConnection: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../util/metrics/MultichainAPI/networkMetricUtils', () => ({
  addItemToChainIdList: jest.fn().mockReturnValue({
    chain_id_list: ['eip155:1', 'eip155:137'],
  }),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setTokenNetworkFilter: jest.fn(),
    },
    NetworkController: {
      updateNetwork: jest.fn(),
      addNetwork: jest.fn(),
      setActiveNetwork: jest.fn(),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
  },
}));

// Mock Value Type for testing purposes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockVal = any;

const mockNetworkControllerAddNetwork = jest.mocked(
  Engine.context.NetworkController.addNetwork,
);

const mockAddTraitsToUser = jest.fn();
jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnThis(),
    }),
    addTraitsToUser: mockAddTraitsToUser,
  }),
}));

interface NetworkProps {
  isVisible: boolean;
  onClose: () => void;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  networkConfiguration: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  shouldNetworkSwitchPopToWallet: boolean;
  onNetworkSwitch?: () => void;
  showPopularNetworkModal: boolean;
}

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: () => ({
    networks: [],
    selectNetwork: jest.fn(),
    selectCustomNetwork: jest.fn(),
    selectPopularNetwork: jest.fn(),
  }),
  NetworkType: {
    Popular: 'popular',
    Custom: 'custom',
  },
}));

jest.mock('../../hooks/useNetworkSelection/useNetworkSelection', () => ({
  useNetworkSelection: () => ({
    selectCustomNetwork: jest.fn(),
    selectPopularNetwork: jest.fn(),
    selectNetwork: jest.fn(),
  }),
}));

describe('NetworkDetails', () => {
  const props: NetworkProps = {
    isVisible: true,
    onClose: jest.fn(),
    networkConfiguration: {
      chainId: '0x1',
      nickname: 'Test Network',
      ticker: 'TEST',
      rpcUrl: 'https://localhost:8545',
      formattedRpcUrl: 'https://localhost:8545',
      rpcPrefs: { blockExplorerUrl: 'https://test.com', imageUrl: 'image' },
    },
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    shouldNetworkSwitchPopToWallet: true,
    showPopularNetworkModal: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectNetworkName) return 'Ethereum Main Network';
      if (selector === selectUseSafeChainsListValidation) return true;
      return {};
    });
  });

  const renderWithTheme = (component: React.ReactNode) =>
    render(
      <ThemeContext.Provider value={mockTheme}>
        {component}
      </ThemeContext.Provider>,
    );

  it('renders correctly', () => {
    (useSelector as jest.MockedFn<typeof useSelector>).mockImplementation(
      (selector) => {
        if (selector === selectNetworkName) return 'Ethereum Main Network';
        if (selector === selectUseSafeChainsListValidation) return true;
      },
    );
    const { toJSON } = renderWithTheme(<NetworkModal {...props} />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('should call setTokenNetworkFilter when switching networks', async () => {
    const { getByTestId } = renderWithTheme(<NetworkModal {...props} />);

    const approveButton = getByTestId(
      NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
    );
    fireEvent.press(approveButton);

    const switchButton = getByTestId(
      NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
    );
    await act(async () => {
      fireEvent.press(switchButton);
    });

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should call setActiveNetwork when adding a new network', async () => {
    const { getByTestId } = renderWithTheme(<NetworkModal {...props} />);

    const approveButton = getByTestId(
      NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
    );
    fireEvent.press(approveButton);

    const switchButton = getByTestId(
      NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
    );

    (
      Engine.context.NetworkController.addNetwork as jest.Mock
    ).mockResolvedValue({
      rpcEndpoints: [{ networkClientId: 'test-network-id' }],
      defaultRpcEndpointIndex: 0,
    });

    await act(async () => {
      fireEvent.press(switchButton);
    });

    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('test-network-id');
  });

  it('should call setActiveNetwork when updating an existing network', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectNetworkName) return 'Ethereum Main Network';
      if (selector === selectUseSafeChainsListValidation) return true;
      if (selector === selectNetworkConfigurations)
        return {
          '0x1': {
            chainId: '0x1',
          },
        };
      return {};
    });

    const { getByTestId } = renderWithTheme(<NetworkModal {...props} />);

    const approveButton = getByTestId(
      NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
    );
    fireEvent.press(approveButton);

    const switchButton = getByTestId(
      NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
    );

    (
      Engine.context.NetworkController.updateNetwork as jest.Mock
    ).mockResolvedValue({
      rpcEndpoints: [{ networkClientId: 'test-network-id' }],
      defaultRpcEndpointIndex: 0,
    });

    await act(async () => {
      fireEvent.press(switchButton);
    });

    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('test-network-id');
  });

  it('should call onUpdateNetworkFilter and setActiveNetwork when networkClientId is present', async () => {
    const { getByTestId } = renderWithTheme(<NetworkModal {...props} />);

    const approveButton = getByTestId(
      NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
    );
    fireEvent.press(approveButton);

    const switchButton = getByTestId(
      NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
    );

    (
      Engine.context.NetworkController.addNetwork as jest.Mock
    ).mockResolvedValue({
      rpcEndpoints: [{ networkClientId: 'test-network-id' }],
      defaultRpcEndpointIndex: 0,
    });

    await act(async () => {
      fireEvent.press(switchButton);
    });

    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('test-network-id');
  });

  it('should call addTraitsToUser with chain ID list when adding a new network', async () => {
    const { getByTestId } = renderWithTheme(<NetworkModal {...props} />);

    const approveButton = getByTestId(
      NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
    );
    fireEvent.press(approveButton);

    const switchButton = getByTestId(
      NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
    );

    (
      Engine.context.NetworkController.addNetwork as jest.Mock
    ).mockResolvedValue({
      rpcEndpoints: [{ networkClientId: 'test-network-id' }],
      defaultRpcEndpointIndex: 0,
    });

    await act(async () => {
      fireEvent.press(switchButton);
    });

    expect(mockAddTraitsToUser).toHaveBeenCalledWith({
      chain_id_list: ['eip155:1', 'eip155:137'],
    });
  });

  it('should call addTraitsToUser with chain ID list when updating an existing network', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectNetworkName) return 'Ethereum Main Network';
      if (selector === selectUseSafeChainsListValidation) return true;
      if (selector === selectNetworkConfigurations)
        return {
          '0x1': {
            chainId: '0x1',
          },
        };
      return {};
    });

    const { getByTestId } = renderWithTheme(<NetworkModal {...props} />);

    const approveButton = getByTestId(
      NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
    );
    fireEvent.press(approveButton);

    const switchButton = getByTestId(
      NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
    );

    (
      Engine.context.NetworkController.updateNetwork as jest.Mock
    ).mockResolvedValue({
      rpcEndpoints: [{ networkClientId: 'test-network-id' }],
      defaultRpcEndpointIndex: 0,
    });

    await act(async () => {
      fireEvent.press(switchButton);
    });

    expect(mockAddTraitsToUser).toHaveBeenCalledWith({
      chain_id_list: ['eip155:1', 'eip155:137'],
    });
  });

  describe('closeModal', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle adding new network correctly', async () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectNetworkConfigurations) return {};
        return {};
      });

      const { getByTestId } = renderWithTheme(<NetworkModal {...props} />);
      (
        Engine.context.NetworkController.addNetwork as jest.Mock
      ).mockResolvedValue({
        rpcEndpoints: [{ networkClientId: 'new-network-id' }],
        defaultRpcEndpointIndex: 0,
      });

      await act(async () => {
        mockNetworkControllerAddNetwork.mockReturnValue({
          rpcEndpoints: [{ networkClientId: 'new-network-id' }],
          defaultRpcEndpointIndex: 0,
        } as MockVal);
        const approveButton = getByTestId(
          NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
        );
        fireEvent.press(approveButton);
      });

      await act(async () => {
        const closeButton = getByTestId(
          NetworkAddedBottomSheetSelectorsIDs.CLOSE_NETWORK_BUTTON,
        );
        fireEvent.press(closeButton);
      });

      expect(Engine.context.NetworkController.addNetwork).toHaveBeenCalledWith({
        chainId: props.networkConfiguration.chainId,
        blockExplorerUrls: [
          props.networkConfiguration.rpcPrefs.blockExplorerUrl,
        ],
        defaultRpcEndpointIndex: 0,
        defaultBlockExplorerUrlIndex: 0,
        name: props.networkConfiguration.nickname,
        nativeCurrency: props.networkConfiguration.ticker,
        rpcEndpoints: [
          {
            url: props.networkConfiguration.rpcUrl,
            name: props.networkConfiguration.nickname,
            type: 'custom',
          },
        ],
      });
    });
  });

  describe('Network Manager Integration', () => {
    let mockSelectNetwork: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();

      mockSelectNetwork = jest.fn();
      const useNetworkSelectionModule = jest.requireMock(
        '../../hooks/useNetworkSelection/useNetworkSelection',
      );
      useNetworkSelectionModule.useNetworkSelection = () => ({
        selectCustomNetwork: jest.fn(),
        selectPopularNetwork: jest.fn(),
        selectNetwork: mockSelectNetwork,
      });
    });

    it('should call selectNetwork when adding a new network', async () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectNetworkConfigurations) return {};
        return {};
      });

      const { getByTestId } = renderWithTheme(<NetworkModal {...props} />);
      (
        Engine.context.NetworkController.addNetwork as jest.Mock
      ).mockResolvedValue({
        rpcEndpoints: [{ networkClientId: 'new-network-id' }],
        defaultRpcEndpointIndex: 0,
      });

      await act(async () => {
        const approveButton = getByTestId(
          NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
        );
        fireEvent.press(approveButton);
      });

      await act(async () => {
        const closeButton = getByTestId(
          NetworkAddedBottomSheetSelectorsIDs.CLOSE_NETWORK_BUTTON,
        );
        fireEvent.press(closeButton);
      });

      expect(mockSelectNetwork).toHaveBeenCalledWith('0x1');
    });

    it('should call selectNetwork when switching networks', async () => {
      const { getByTestId } = renderWithTheme(<NetworkModal {...props} />);

      const approveButton = getByTestId(
        NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
      );
      fireEvent.press(approveButton);

      const switchButton = getByTestId(
        NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
      );

      // Mock the addNetwork response to include networkClientId
      (
        Engine.context.NetworkController.addNetwork as jest.Mock
      ).mockResolvedValue({
        rpcEndpoints: [{ networkClientId: 'test-network-id' }],
        defaultRpcEndpointIndex: 0,
      });

      await act(async () => {
        fireEvent.press(switchButton);
      });

      expect(mockSelectNetwork).toHaveBeenCalledWith('0x1');
    });

    it('should call selectNetwork when updating an existing network', async () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectNetworkName) return 'Ethereum Main Network';
        if (selector === selectUseSafeChainsListValidation) return true;
        if (selector === selectNetworkConfigurations)
          return {
            '0x1': {
              chainId: '0x1',
            },
          };
        return {};
      });

      const { getByTestId } = renderWithTheme(<NetworkModal {...props} />);

      const approveButton = getByTestId(
        NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
      );
      fireEvent.press(approveButton);

      const switchButton = getByTestId(
        NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
      );

      (
        Engine.context.NetworkController.updateNetwork as jest.Mock
      ).mockResolvedValue({
        rpcEndpoints: [{ networkClientId: 'test-network-id' }],
        defaultRpcEndpointIndex: 0,
      });

      await act(async () => {
        fireEvent.press(switchButton);
      });

      expect(mockSelectNetwork).toHaveBeenCalledWith('0x1');
    });

    it('should call selectNetwork with correct chainId format', async () => {
      const propsWithDifferentChainId = {
        ...props,
        networkConfiguration: {
          ...props.networkConfiguration,
          chainId: '0x89', // Polygon chainId
        },
      };

      const { getByTestId } = renderWithTheme(
        <NetworkModal {...propsWithDifferentChainId} />,
      );

      const approveButton = getByTestId(
        NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
      );
      fireEvent.press(approveButton);

      const switchButton = getByTestId(
        NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
      );

      (
        Engine.context.NetworkController.addNetwork as jest.Mock
      ).mockResolvedValue({
        rpcEndpoints: [{ networkClientId: 'test-network-id' }],
        defaultRpcEndpointIndex: 0,
      });

      await act(async () => {
        fireEvent.press(switchButton);
      });

      expect(mockSelectNetwork).toHaveBeenCalledWith('0x89');
    });
  });
});
