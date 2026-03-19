import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { NetworkFormState } from '../NetworkDetailsView.types';
import { useNetworkOperations } from './useNetworkOperations';
import {
  selectIsAllNetworks,
  selectEvmNetworkConfigurationsByChainId,
  selectProviderConfig,
} from '../../../../../selectors/networkController';
import { selectTokenNetworkFilter } from '../../../../../selectors/preferencesController';

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

jest.mock('../../../../../selectors/networkController', () => ({
  selectIsAllNetworks: jest.fn(),
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
  selectProviderConfig: jest.fn(),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectTokenNetworkFilter: jest.fn(),
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

const setupSelectors = (
  overrides: {
    networkConfigurations?: unknown;
    providerConfig?: unknown;
    isAllNetworks?: unknown;
    tokenNetworkFilter?: unknown;
  } = {},
) => {
  const configs = overrides.networkConfigurations ?? {};
  const provider = overrides.providerConfig ?? {
    type: 'rpc',
    rpcUrl: 'https://old.rpc.io',
  };
  const allNetworks = overrides.isAllNetworks ?? true;
  const tokenFilter = overrides.tokenNetworkFilter ?? {};

  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectEvmNetworkConfigurationsByChainId) return configs;
    if (selector === selectProviderConfig) return provider;
    if (selector === selectIsAllNetworks) return allNetworks;
    if (selector === selectTokenNetworkFilter) return tokenFilter;
    return undefined;
  });
};

describe('useNetworkOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectors();
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

  it('does nothing when disabledBySymbol is true', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(baseForm, {
        ...defaultSaveOpts(),
        disabledBySymbol: true,
      });
    });

    expect(mockAddNetwork).not.toHaveBeenCalled();
    expect(mockUpdateNetwork).not.toHaveBeenCalled();
  });

  it('does nothing when rpcUrl is missing', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(
        { ...baseForm, rpcUrl: undefined },
        defaultSaveOpts(),
      );
    });

    expect(mockAddNetwork).not.toHaveBeenCalled();
  });

  it('handles chainId already in hex format', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(
        { ...baseForm, chainId: '0x2a' },
        { ...defaultSaveOpts(), shouldNetworkSwitchPopToWallet: false },
      );
    });

    const callArgs = mockAddNetwork.mock.calls[0][0];
    expect(callArgs.chainId).toBe('0x2a');
  });

  it('uses empty string when ticker is undefined', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(
        { ...baseForm, ticker: undefined },
        { ...defaultSaveOpts(), shouldNetworkSwitchPopToWallet: false },
      );
    });

    const callArgs = mockAddNetwork.mock.calls[0][0];
    expect(callArgs.nativeCurrency).toBe('');
  });

  it('uses empty string when nickname is undefined', async () => {
    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(
        { ...baseForm, nickname: undefined },
        { ...defaultSaveOpts(), shouldNetworkSwitchPopToWallet: false },
      );
    });

    const callArgs = mockAddNetwork.mock.calls[0][0];
    expect(callArgs.name).toBe('');
  });

  it('sets individual chain filter when isAllNetworks is false', async () => {
    setupSelectors({
      isAllNetworks: false,
      tokenNetworkFilter: { '0x1': true },
    });

    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(baseForm, {
        ...defaultSaveOpts(),
        shouldNetworkSwitchPopToWallet: false,
      });
    });

    expect(mockSetTokenNetworkFilter).toHaveBeenCalledWith({
      '0x2a': true,
    });
  });

  it('merges into existing filter when isAllNetworks is true', async () => {
    setupSelectors({
      isAllNetworks: true,
      tokenNetworkFilter: { '0x1': true },
    });

    const { result } = renderHook(() => useNetworkOperations());

    await act(async () => {
      await result.current.saveNetwork(baseForm, {
        ...defaultSaveOpts(),
        shouldNetworkSwitchPopToWallet: false,
      });
    });

    expect(mockSetTokenNetworkFilter).toHaveBeenCalledWith({
      '0x1': true,
      '0x2a': true,
    });
  });

  describe('updateNetwork (existing network)', () => {
    const existingChainId = '0x2a';

    const setupExistingNetwork = () => {
      setupSelectors({
        providerConfig: { type: 'rpc', rpcUrl: 'https://rpc.example.com' },
        networkConfigurations: {
          [existingChainId]: {
            chainId: existingChainId,
            rpcEndpoints: [
              {
                url: 'https://rpc.example.com/',
                name: 'Old RPC',
                type: 'Custom',
              },
            ],
            defaultRpcEndpointIndex: 0,
            nativeCurrency: 'OLD',
            name: 'OldNet',
            blockExplorerUrls: [],
          },
        },
      });
    };

    it('calls updateNetwork for an existing network', async () => {
      setupExistingNetwork();

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.saveNetwork(
          {
            ...baseForm,
            chainId: '42',
            addMode: false,
            rpcUrls: [
              {
                url: 'https://rpc.example.com/',
                name: 'Test RPC',
                type: 'Custom',
              },
            ],
          },
          { ...defaultSaveOpts(), shouldNetworkSwitchPopToWallet: false },
        );
      });

      expect(mockUpdateNetwork).toHaveBeenCalledWith(
        existingChainId,
        expect.objectContaining({
          chainId: existingChainId,
          nativeCurrency: 'TST',
          name: 'TestNet',
        }),
        expect.objectContaining({
          replacementSelectedRpcEndpointIndex: 0,
        }),
      );
      expect(mockAddNetwork).not.toHaveBeenCalled();
    });

    it('passes options with indexRpc when form rpcUrl is not in rpcUrls list', async () => {
      setupExistingNetwork();

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.saveNetwork(
          {
            ...baseForm,
            chainId: '42',
            addMode: false,
            rpcUrl: 'https://different-rpc.example.com',
            rpcUrls: [
              { url: 'https://rpc.example.com', name: 'RPC', type: 'Custom' },
            ],
          },
          { ...defaultSaveOpts(), shouldNetworkSwitchPopToWallet: false },
        );
      });

      expect(mockUpdateNetwork).toHaveBeenCalledWith(
        existingChainId,
        expect.objectContaining({
          defaultRpcEndpointIndex: -1,
        }),
        expect.objectContaining({
          replacementSelectedRpcEndpointIndex: -1,
        }),
      );
    });

    it('detects existing network in addMode and calls updateNetwork', async () => {
      setupExistingNetwork();

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.saveNetwork(
          { ...baseForm, chainId: '42', addMode: true },
          { ...defaultSaveOpts(), shouldNetworkSwitchPopToWallet: false },
        );
      });

      expect(mockUpdateNetwork).toHaveBeenCalled();
      expect(mockAddNetwork).not.toHaveBeenCalled();
    });

    it('tracks RPC update event when trackRpcUpdateFromBanner is true', async () => {
      setupExistingNetwork();

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.saveNetwork(
          {
            ...baseForm,
            chainId: '42',
            addMode: false,
            rpcUrls: [
              {
                url: 'https://rpc.example.com/',
                name: 'Test RPC',
                type: 'Custom',
              },
            ],
          },
          {
            ...defaultSaveOpts(),
            trackRpcUpdateFromBanner: true,
            shouldNetworkSwitchPopToWallet: false,
          },
        );
      });

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('reports "custom" domain for non-public RPC URLs in tracking', async () => {
      const { isPublicEndpointUrl } = jest.requireMock(
        '../../../../../core/Engine/controllers/network-controller/utils',
      );
      (isPublicEndpointUrl as jest.Mock).mockReturnValue(false);

      setupExistingNetwork();

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.saveNetwork(
          {
            ...baseForm,
            chainId: '42',
            addMode: false,
            rpcUrls: [
              {
                url: 'https://rpc.example.com/',
                name: 'Test RPC',
                type: 'Custom',
              },
            ],
          },
          {
            ...defaultSaveOpts(),
            trackRpcUpdateFromBanner: true,
            shouldNetworkSwitchPopToWallet: false,
          },
        );
      });

      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          from_rpc_domain: 'custom',
          to_rpc_domain: 'custom',
        }),
      );
    });

    it('reports "unknown" when old endpoint has no URL', async () => {
      setupSelectors({
        providerConfig: { type: 'rpc', rpcUrl: 'https://rpc.example.com' },
        networkConfigurations: {
          '0x2a': {
            chainId: '0x2a',
            rpcEndpoints: [],
            defaultRpcEndpointIndex: undefined,
            nativeCurrency: 'OLD',
            name: 'OldNet',
            blockExplorerUrls: [],
          },
        },
      });

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.saveNetwork(
          {
            ...baseForm,
            chainId: '42',
            addMode: false,
            rpcUrls: [
              {
                url: 'https://rpc.example.com/',
                name: 'Test RPC',
                type: 'Custom',
              },
            ],
          },
          {
            ...defaultSaveOpts(),
            trackRpcUpdateFromBanner: true,
            shouldNetworkSwitchPopToWallet: false,
          },
        );
      });

      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          from_rpc_domain: 'unknown',
        }),
      );
    });

    it('sets defaultBlockExplorerUrlIndex to undefined when explorer URL is not in list', async () => {
      setupExistingNetwork();

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.saveNetwork(
          {
            ...baseForm,
            chainId: '42',
            addMode: false,
            blockExplorerUrl: 'https://other-scan.example.com',
            blockExplorerUrls: ['https://scan.example.com'],
            rpcUrls: [
              {
                url: 'https://rpc.example.com/',
                name: 'Test RPC',
                type: 'Custom',
              },
            ],
          },
          { ...defaultSaveOpts(), shouldNetworkSwitchPopToWallet: false },
        );
      });

      const callArgs = mockUpdateNetwork.mock.calls[0][1];
      expect(callArgs.defaultBlockExplorerUrlIndex).toBeUndefined();
    });
  });

  describe('handleNetworkUpdate – private connections', () => {
    it('preserves non-https protocol for private connections', async () => {
      const { isPrivateConnection } = jest.requireMock(
        '../../../../../util/networks',
      );
      (isPrivateConnection as jest.Mock).mockReturnValueOnce(true);

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.saveNetwork(
          {
            ...baseForm,
            rpcUrl: 'http://localhost:8545',
            rpcUrls: [
              { url: 'http://localhost:8545', name: 'Local', type: 'Custom' },
            ],
          },
          { ...defaultSaveOpts(), shouldNetworkSwitchPopToWallet: false },
        );
      });

      const callArgs = mockAddNetwork.mock.calls[0][0];
      expect(callArgs.rpcEndpoints[0].url).toContain('http://localhost');
    });
  });

  describe('removeNetwork', () => {
    it('removes a network and navigates back', async () => {
      setupSelectors({
        providerConfig: { type: 'rpc', rpcUrl: 'https://other.rpc.io' },
        networkConfigurations: {
          '0x2a': {
            chainId: '0x2a',
            rpcEndpoints: [{ url: 'https://rpc.example.com' }],
            defaultRpcEndpointIndex: 0,
          },
        },
      });

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.removeNetwork('0x2a');
      });

      expect(mockRemoveNetwork).toHaveBeenCalledWith('0x2a');
      expect(mockAddTraitsToUser).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('throws when network is not found', async () => {
      const { result } = renderHook(() => useNetworkOperations());

      await expect(
        act(async () => {
          await result.current.removeNetwork('0xdead');
        }),
      ).rejects.toThrow('Unable to find network');
    });

    it('switches to mainnet and schedules incoming tx refresh when removing the active RPC network', async () => {
      jest.useFakeTimers();
      const { compareSanitizedUrl } = jest.requireMock(
        '../../../../../util/sanitizeUrl',
      );
      (compareSanitizedUrl as jest.Mock).mockReturnValueOnce(true);
      const { updateIncomingTransactions } = jest.requireMock(
        '../../../../../util/transaction-controller',
      );

      setupSelectors({
        providerConfig: { type: 'rpc', rpcUrl: 'https://rpc.example.com' },
        networkConfigurations: {
          '0x2a': {
            chainId: '0x2a',
            rpcEndpoints: [{ url: 'https://rpc.example.com' }],
            defaultRpcEndpointIndex: 0,
          },
          '0x1': {
            chainId: '0x1',
            rpcEndpoints: [
              {
                url: 'https://mainnet.infura.io',
                networkClientId: 'mainnet-client',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
      });

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.removeNetwork('0x2a');
      });

      expect(mockSetActiveNetwork).toHaveBeenCalledWith('mainnet-client');
      expect(mockRemoveNetwork).toHaveBeenCalledWith('0x2a');
      expect(mockGoBack).toHaveBeenCalled();

      expect(updateIncomingTransactions).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1000);
      expect(updateIncomingTransactions).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('does not switch to mainnet when provider type is not rpc', async () => {
      const { compareSanitizedUrl } = jest.requireMock(
        '../../../../../util/sanitizeUrl',
      );
      (compareSanitizedUrl as jest.Mock).mockReturnValueOnce(true);

      setupSelectors({
        providerConfig: { type: 'mainnet', rpcUrl: 'https://rpc.example.com' },
        networkConfigurations: {
          '0x2a': {
            chainId: '0x2a',
            rpcEndpoints: [{ url: 'https://rpc.example.com' }],
            defaultRpcEndpointIndex: 0,
          },
        },
      });

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.removeNetwork('0x2a');
      });

      expect(mockSetActiveNetwork).not.toHaveBeenCalled();
      expect(mockRemoveNetwork).toHaveBeenCalledWith('0x2a');
    });

    it('handles undefined providerConfig.rpcUrl gracefully', async () => {
      const { compareSanitizedUrl } = jest.requireMock(
        '../../../../../util/sanitizeUrl',
      );
      (compareSanitizedUrl as jest.Mock).mockReturnValueOnce(false);

      setupSelectors({
        providerConfig: { type: 'rpc', rpcUrl: undefined },
        networkConfigurations: {
          '0x2a': {
            chainId: '0x2a',
            rpcEndpoints: [{ url: 'https://rpc.example.com' }],
            defaultRpcEndpointIndex: 0,
          },
        },
      });

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.removeNetwork('0x2a');
      });

      expect(compareSanitizedUrl).toHaveBeenCalledWith(
        'https://rpc.example.com',
        '',
      );
      expect(mockSetActiveNetwork).not.toHaveBeenCalled();
      expect(mockRemoveNetwork).toHaveBeenCalledWith('0x2a');
    });

    it('handles missing mainnet configuration when switching active network', async () => {
      jest.useFakeTimers();
      const { compareSanitizedUrl } = jest.requireMock(
        '../../../../../util/sanitizeUrl',
      );
      (compareSanitizedUrl as jest.Mock).mockReturnValueOnce(true);

      setupSelectors({
        providerConfig: { type: 'rpc', rpcUrl: 'https://rpc.example.com' },
        networkConfigurations: {
          '0x2a': {
            chainId: '0x2a',
            rpcEndpoints: [{ url: 'https://rpc.example.com' }],
            defaultRpcEndpointIndex: 0,
          },
        },
      });

      const { result } = renderHook(() => useNetworkOperations());

      await act(async () => {
        await result.current.removeNetwork('0x2a');
      });

      expect(mockSetActiveNetwork).toHaveBeenCalledWith(undefined);
      expect(mockRemoveNetwork).toHaveBeenCalledWith('0x2a');

      jest.useRealTimers();
    });
  });
});
