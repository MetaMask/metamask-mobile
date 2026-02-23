import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { NetworkFormState } from '../NetworkDetailsView.types';
import { useNetworkOperations } from './useNetworkOperations';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  isPrivateConnection: jest.fn(() => false),
  getAllNetworks: jest.fn(() => ['mainnet', 'sepolia']),
}));

const mockAddNetwork = jest.fn().mockResolvedValue(undefined);
const mockUpdateNetwork = jest.fn().mockResolvedValue(undefined);
const mockRemoveNetwork = jest.fn();
const mockSetActiveNetwork = jest.fn().mockResolvedValue(undefined);
const mockSetTokenNetworkFilter = jest.fn();
const mockEnableNetwork = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      addNetwork: (...args: unknown[]) => mockAddNetwork(...args),
      updateNetwork: (...args: unknown[]) => mockUpdateNetwork(...args),
      removeNetwork: (...args: unknown[]) => mockRemoveNetwork(...args),
    },
    PreferencesController: {
      setTokenNetworkFilter: (...args: unknown[]) =>
        mockSetTokenNetworkFilter(...args),
    },
    MultichainNetworkController: {
      setActiveNetwork: (...args: unknown[]) => mockSetActiveNetwork(...args),
    },
    NetworkEnablementController: {
      enableNetwork: (...args: unknown[]) => mockEnableNetwork(...args),
    },
  },
}));

jest.mock('../../../../../util/transaction-controller', () => ({
  updateIncomingTransactions: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockAddTraitsToUser = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn(),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    addTraitsToUser: mockAddTraitsToUser,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../util/sanitizeUrl', () => ({
  compareSanitizedUrl: jest.fn(() => false),
}));

jest.mock('../../../../../util/onlyKeepHost', () =>
  jest.fn((url: string) => url),
);

jest.mock(
  '../../../../../core/Engine/controllers/network-controller/utils',
  () => ({
    isPublicEndpointUrl: jest.fn(() => true),
  }),
);

jest.mock(
  '../../../../../util/metrics/MultichainAPI/networkMetricUtils',
  () => ({
    addItemToChainIdList: jest.fn(() => ({})),
    removeItemFromChainIdList: jest.fn(() => ({})),
  }),
);

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const baseForm: NetworkFormState = {
  rpcUrl: 'https://rpc.example.com',
  failoverRpcUrls: undefined,
  rpcName: 'Test RPC',
  rpcUrlForm: '',
  rpcNameForm: '',
  rpcUrls: [
    { url: 'https://rpc.example.com', name: 'Test RPC', type: 'Custom' },
  ],
  blockExplorerUrls: ['https://scan.example.com'],
  selectedRpcEndpointIndex: 0,
  blockExplorerUrl: 'https://scan.example.com',
  blockExplorerUrlForm: undefined,
  nickname: 'TestNet',
  chainId: '42',
  ticker: 'TST',
  editable: true,
  addMode: true,
};

const defaultSaveOpts = () => ({
  enableAction: true,
  disabledByChainId: false,
  disabledBySymbol: false,
  isCustomMainnet: false,
  shouldNetworkSwitchPopToWallet: true,
  trackRpcUpdateFromBanner: false,
  validateChainIdOnSubmit: jest.fn().mockResolvedValue(true),
});

describe('useNetworkOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      const name = selector.name || '';
      if (name.includes('AllNetworks')) return true;
      if (name.includes('TokenNetworkFilter')) return {};
      if (name.includes('ProviderConfig'))
        return { type: 'rpc', rpcUrl: 'https://old.rpc.io' };
      // networkConfigurations
      return {};
    });
  });

  it('does nothing when enableAction is false', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(baseForm, {
        ...defaultSaveOpts(),
        enableAction: false,
      });
    });

    expect(mockAddNetwork).not.toHaveBeenCalled();
    expect(mockUpdateNetwork).not.toHaveBeenCalled();
  });

  it('does nothing when disabledByChainId is true', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(baseForm, {
        ...defaultSaveOpts(),
        disabledByChainId: true,
      });
    });

    expect(mockAddNetwork).not.toHaveBeenCalled();
  });

  it('does nothing when chainId is missing', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(
        { ...baseForm, chainId: undefined },
        defaultSaveOpts(),
      );
    });

    expect(mockAddNetwork).not.toHaveBeenCalled();
  });

  it('aborts when validateChainIdOnSubmit returns false', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(baseForm, {
        ...defaultSaveOpts(),
        validateChainIdOnSubmit: jest.fn().mockResolvedValue(false),
      });
    });

    expect(mockAddNetwork).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('adds a new network and navigates back', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(baseForm, {
        ...defaultSaveOpts(),
        shouldNetworkSwitchPopToWallet: false,
      });
    });

    expect(mockSetTokenNetworkFilter).toHaveBeenCalled();
    expect(mockEnableNetwork).toHaveBeenCalled();
    expect(mockAddNetwork).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to WalletView when shouldNetworkSwitchPopToWallet is true', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(baseForm, defaultSaveOpts());
    });

    expect(mockNavigate).toHaveBeenCalledWith('WalletView');
  });

  it('navigates to OptinMetrics when isCustomMainnet is true', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(baseForm, {
        ...defaultSaveOpts(),
        isCustomMainnet: true,
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('OptinMetrics');
  });

  it('uppercases the ticker before saving', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(
        { ...baseForm, ticker: 'tst' },
        { ...defaultSaveOpts(), shouldNetworkSwitchPopToWallet: false },
      );
    });

    const callArgs = mockAddNetwork.mock.calls[0][0];
    expect(callArgs.nativeCurrency).toBe('TST');
  });

  describe('goToNetworkEdit', () => {
    it('navigates to EDIT_NETWORK route', () => {
      const { result } = renderHook(() => useNetworkOperations());

      act(() => {
        result.current.goToNetworkEdit('https://rpc.example.com');
      });

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          network: 'https://rpc.example.com',
        }),
      );
    });
  });

  describe('removeNetwork', () => {
    it('removes a network and navigates back', async () => {
      mockUseSelector.mockImplementation((selector) => {
        const name = selector.name || '';
        if (name.includes('AllNetworks')) return true;
        if (name.includes('TokenNetworkFilter')) return {};
        if (name.includes('ProviderConfig'))
          return { type: 'rpc', rpcUrl: 'https://other.rpc.io' };
        return {
          '0x2a': {
            chainId: '0x2a',
            rpcEndpoints: [{ url: 'https://rpc.example.com' }],
            defaultRpcEndpointIndex: 0,
          },
        };
      });

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.removeNetwork('https://rpc.example.com');
      });

      expect(mockRemoveNetwork).toHaveBeenCalledWith('0x2a');
      expect(mockAddTraitsToUser).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('throws when network is not found', async () => {
      const { result } = renderHook(() => useNetworkOperations());

      await expect(
        act(async () => {
          await result.current.removeNetwork('https://nonexistent.rpc.io');
        }),
      ).rejects.toThrow('Unable to find network');
    });
  });
});
