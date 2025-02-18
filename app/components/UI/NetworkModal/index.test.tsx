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

    expect(
      Engine.context.PreferencesController.setTokenNetworkFilter,
    ).toHaveBeenCalledWith({
      [props.networkConfiguration.chainId]: true,
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

    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('test-network-id');
  });

  it('should call setActiveNetwork when updating an existing network', async () => {
    // Mock existing network configuration
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

    // Mock the updateNetwork response to include networkClientId
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

    // Verify onUpdateNetworkFilter was called (via setTokenNetworkFilter)
    expect(
      Engine.context.PreferencesController.setTokenNetworkFilter,
    ).toHaveBeenCalledWith({
      [props.networkConfiguration.chainId]: true,
    });

    // Verify setActiveNetwork was called with the networkClientId
    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('test-network-id');
  });

  describe('closeModal', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle adding new network correctly', async () => {
      // Mock empty network configurations
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectNetworkConfigurations) return {};
        return {};
      });

      const { getByTestId } = renderWithTheme(<NetworkModal {...props} />);

      // Mock the addNetwork response
      (
        Engine.context.NetworkController.addNetwork as jest.Mock
      ).mockResolvedValue({
        rpcEndpoints: [{ networkClientId: 'new-network-id' }],
        defaultRpcEndpointIndex: 0,
      });

      await act(async () => {
        //@ts-expect-error - mockResolvedValueOnce is a jest function in the jest environment
        Engine.context.NetworkController.addNetwork.mockResolvedValueOnce({
          rpcEndpoints: [{ networkClientId: 'new-network-id' }],
          defaultRpcEndpointIndex: 0,
        });
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

      // Verify network was added with correct parameters
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

      // Verify active network was set
      expect(
        Engine.context.MultichainNetworkController.setActiveNetwork,
      ).toHaveBeenCalledWith('new-network-id');
    });
  });
});
