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
});
