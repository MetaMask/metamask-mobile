import { initialState } from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useInitialSourceToken } from '.';
import { waitFor } from '@testing-library/react-native';
import { BridgeViewMode, BridgeToken } from '../../types';
import {
  selectBridgeViewMode,
  setSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { useNetworkInfo } from '../../../../../selectors/selectedNetworkController';
import { useSwitchNetworks } from '../../../../Views/NetworkSelector/useSwitchNetworks';
import { Hex } from '@metamask/utils';
import { constants } from 'ethers';
import { getNativeAssetForChainId } from '@metamask/bridge-controller';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    setSourceToken: jest.fn(actual.setSourceToken),
    selectBridgeViewMode: jest.fn().mockReturnValue('Bridge'),
  };
});

jest.mock('../../../../../selectors/networkController', () => {
  const actual = jest.requireActual(
    '../../../../../selectors/networkController',
  );
  return {
    ...actual,
    selectEvmNetworkConfigurationsByChainId: jest.fn(
      actual.selectEvmNetworkConfigurationsByChainId,
    ),
  };
});

jest.mock('../../../../../selectors/selectedNetworkController', () => {
  const actual = jest.requireActual(
    '../../../../../selectors/selectedNetworkController',
  );
  return {
    ...actual,
    useNetworkInfo: jest.fn(actual.useNetworkInfo),
  };
});

jest.mock('../../../../Views/NetworkSelector/useSwitchNetworks', () => {
  const actual = jest.requireActual(
    '../../../../Views/NetworkSelector/useSwitchNetworks',
  );
  return {
    ...actual,
    useSwitchNetworks: jest.fn(actual.useSwitchNetworks),
  };
});

jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    getNativeAssetForChainId: jest.fn(actual.getNativeAssetForChainId),
  };
});

describe('useInitialSourceToken', () => {
  const mockChainId = '0x1' as Hex;
  const mockNetworkConfigurations = {
    [mockChainId]: {
      chainId: mockChainId,
      rpcUrl: 'https://mock-rpc-url.com',
      ticker: 'ETH',
      label: 'Ethereum Mainnet',
    },
  };

  const mockNetworkInfo = {
    chainId: mockChainId,
    domainIsConnectedDapp: false,
    networkName: 'Ethereum Mainnet',
  };

  const mockSwitchNetworks = {
    onSetRpcTarget: jest.fn(),
  };

  const mockNativeAsset = {
    address: constants.AddressZero,
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock network info
    (useNetworkInfo as unknown as jest.Mock).mockReturnValue(mockNetworkInfo);

    // Mock switch networks
    (useSwitchNetworks as unknown as jest.Mock).mockReturnValue(
      mockSwitchNetworks,
    );

    // Mock native asset
    (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);
  });

  it('should set native token as source token when no initial token is provided', async () => {
    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Bridge,
    );

    renderHookWithProvider(() => useInitialSourceToken(undefined), {
      state: initialState,
    });

    await waitFor(() => {
      expect(setSourceToken).toHaveBeenCalledWith({
        address: mockNativeAsset.address,
        name: mockNativeAsset.name,
        symbol: mockNativeAsset.symbol,
        image: '',
        decimals: mockNativeAsset.decimals,
        chainId: mockChainId,
      });
    });
  });

  it('should set the provided token as source token when initial token is provided', async () => {
    const mockToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'TOKEN',
      name: 'Test Token',
      decimals: 18,
      chainId: mockChainId,
    };

    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Swap,
    );

    renderHookWithProvider(() => useInitialSourceToken(mockToken), {
      state: initialState,
    });

    await waitFor(() => {
      expect(setSourceToken).toHaveBeenCalledWith(mockToken);
    });
  });

  it('should set native token when initial token is the zero address', async () => {
    const mockToken: BridgeToken = {
      address: constants.AddressZero,
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      chainId: mockChainId,
    };

    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Swap,
    );

    renderHookWithProvider(() => useInitialSourceToken(mockToken), {
      state: initialState,
    });

    await waitFor(() => {
      expect(setSourceToken).toHaveBeenCalledWith({
        address: mockNativeAsset.address,
        name: mockNativeAsset.name,
        symbol: mockNativeAsset.symbol,
        image: '',
        decimals: mockNativeAsset.decimals,
        chainId: mockChainId,
      });
    });
  });

  it('should change network when initial token chainId differs from selected chainId', async () => {
    const differentChainId = '0x2' as Hex;
    const mockToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'TOKEN',
      name: 'Test Token',
      decimals: 18,
      chainId: differentChainId,
    };

    const updatedNetworkConfigurations = {
      ...mockNetworkConfigurations,
      [differentChainId]: {
        chainId: differentChainId,
        rpcUrl: 'https://different-rpc-url.com',
        ticker: 'TOKEN',
        label: 'Different Network',
      },
    };
    (
      selectEvmNetworkConfigurationsByChainId as unknown as jest.Mock
    ).mockReturnValue(updatedNetworkConfigurations);

    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Swap,
    );

    renderHookWithProvider(() => useInitialSourceToken(mockToken), {
      state: initialState,
    });

    await waitFor(() => {
      expect(setSourceToken).toHaveBeenCalledWith(mockToken);
      expect(mockSwitchNetworks.onSetRpcTarget).toHaveBeenCalledWith(
        updatedNetworkConfigurations[differentChainId],
      );
    });
  });

  it('should not change network when initial token chainId matches selected chainId', async () => {
    const mockToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'TOKEN',
      name: 'Test Token',
      decimals: 18,
      chainId: mockChainId,
    };

    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Swap,
    );

    renderHookWithProvider(() => useInitialSourceToken(mockToken), {
      state: initialState,
    });

    await waitFor(() => {
      expect(setSourceToken).toHaveBeenCalledWith(mockToken);
      expect(mockSwitchNetworks.onSetRpcTarget).not.toHaveBeenCalled();
    });
  });
});
