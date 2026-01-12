import { renderHook, act } from '@testing-library/react-hooks';
import { useAddPopularNetwork } from './useAddPopularNetwork';
import Engine from '../../../core/Engine';
import { useDispatch, useSelector } from 'react-redux';
import { useMetrics } from '../useMetrics';
import { useNetworksByNamespace } from '../useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../useNetworkSelection/useNetworkSelection';
import { networkSwitched } from '../../../actions/onboardNetwork';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { Network } from '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../useMetrics', () => ({
  useMetrics: jest.fn(),
}));

jest.mock('../useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: jest.fn(),
  NetworkType: { Popular: 'popular' },
}));

jest.mock('../useNetworkSelection/useNetworkSelection', () => ({
  useNetworkSelection: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      addNetwork: jest.fn(),
      updateNetwork: jest.fn(),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
  },
}));

jest.mock('../../../actions/onboardNetwork', () => ({
  networkSwitched: jest.fn(),
}));

jest.mock('../../../util/metrics/MultichainAPI/networkMetricUtils', () => ({
  addItemToChainIdList: jest.fn().mockReturnValue({ chainIds: ['0x89'] }),
}));

const createMockNetwork = (overrides?: Partial<Network>): Network => ({
  chainId: '0x89',
  nickname: 'Polygon',
  ticker: 'MATIC',
  rpcUrl: 'https://polygon-rpc.com',
  rpcPrefs: {
    blockExplorerUrl: 'https://polygonscan.com',
  },
  ...overrides,
});

describe('useAddPopularNetwork', () => {
  const mockDispatch = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddTraitsToUser = jest.fn();
  const mockSelectNetwork = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as jest.Mock).mockReturnValue({});
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder.mockReturnValue({
        addProperties: jest.fn().mockReturnValue({
          build: jest.fn().mockReturnValue({ event: 'test' }),
        }),
      }),
      addTraitsToUser: mockAddTraitsToUser,
    });
    (useNetworksByNamespace as jest.Mock).mockReturnValue({
      networks: [],
    });
    (useNetworkSelection as jest.Mock).mockReturnValue({
      selectNetwork: mockSelectNetwork,
    });

    (
      Engine.context.NetworkController.addNetwork as jest.Mock
    ).mockResolvedValue({
      rpcEndpoints: [{ networkClientId: 'test-client-id' }],
      defaultRpcEndpointIndex: 0,
    });
    (
      Engine.context.MultichainNetworkController.setActiveNetwork as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('adds a new network when it does not exist', async () => {
    const mockNetwork = createMockNetwork();
    const { result } = renderHook(() => useAddPopularNetwork());

    await act(async () => {
      await result.current.addPopularNetwork(mockNetwork);
    });

    expect(Engine.context.NetworkController.addNetwork).toHaveBeenCalledWith({
      chainId: '0x89',
      blockExplorerUrls: ['https://polygonscan.com'],
      defaultRpcEndpointIndex: 0,
      defaultBlockExplorerUrlIndex: 0,
      name: 'Polygon',
      nativeCurrency: 'MATIC',
      rpcEndpoints: [
        {
          url: 'https://polygon-rpc.com',
          failoverUrls: undefined,
          name: 'Polygon',
          type: 'custom',
        },
      ],
    });
  });

  it('updates existing network when it already exists', async () => {
    const mockNetwork = createMockNetwork();
    const existingNetwork = {
      chainId: '0x89',
      name: 'Polygon',
      rpcEndpoints: [{ networkClientId: 'existing-client-id' }],
      defaultRpcEndpointIndex: 0,
    };

    (useSelector as jest.Mock).mockReturnValue({
      '0x89': existingNetwork,
    });

    (
      Engine.context.NetworkController.updateNetwork as jest.Mock
    ).mockResolvedValue({
      rpcEndpoints: [{ networkClientId: 'updated-client-id' }],
      defaultRpcEndpointIndex: 0,
    });

    const { result } = renderHook(() => useAddPopularNetwork());

    await act(async () => {
      await result.current.addPopularNetwork(mockNetwork);
    });

    expect(Engine.context.NetworkController.updateNetwork).toHaveBeenCalledWith(
      '0x89',
      existingNetwork,
      { replacementSelectedRpcEndpointIndex: 0 },
    );
    expect(Engine.context.NetworkController.addNetwork).not.toHaveBeenCalled();
  });

  it('tracks RPC_ADDED analytics event', async () => {
    const mockNetwork = createMockNetwork();
    const { result } = renderHook(() => useAddPopularNetwork());

    await act(async () => {
      await result.current.addPopularNetwork(mockNetwork);
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.RPC_ADDED,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('switches to the network after adding when shouldSwitchNetwork is true', async () => {
    const mockNetwork = createMockNetwork();
    const { result } = renderHook(() => useAddPopularNetwork());

    await act(async () => {
      await result.current.addPopularNetwork(mockNetwork, true);
    });

    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('test-client-id');
    expect(mockDispatch).toHaveBeenCalledWith(
      networkSwitched({
        networkUrl: 'https://polygon-rpc.com',
        networkStatus: true,
      }),
    );
  });

  it('does not switch network when shouldSwitchNetwork is false', async () => {
    const mockNetwork = createMockNetwork();
    const { result } = renderHook(() => useAddPopularNetwork());

    await act(async () => {
      await result.current.addPopularNetwork(mockNetwork, false);
    });

    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('updates network filter after adding network', async () => {
    const mockNetwork = createMockNetwork();
    const { result } = renderHook(() => useAddPopularNetwork());

    await act(async () => {
      await result.current.addPopularNetwork(mockNetwork);
    });

    expect(mockSelectNetwork).toHaveBeenCalledWith('0x89');
  });

  it('adds user traits when adding a new network', async () => {
    const mockNetwork = createMockNetwork();
    const { result } = renderHook(() => useAddPopularNetwork());

    await act(async () => {
      await result.current.addPopularNetwork(mockNetwork);
    });

    expect(mockAddTraitsToUser).toHaveBeenCalled();
  });

  it('handles network without block explorer URL', async () => {
    const mockNetwork = createMockNetwork({
      rpcPrefs: {
        blockExplorerUrl: '',
      },
    });

    const { result } = renderHook(() => useAddPopularNetwork());

    await act(async () => {
      await result.current.addPopularNetwork(mockNetwork);
    });

    expect(Engine.context.NetworkController.addNetwork).toHaveBeenCalledWith(
      expect.objectContaining({
        blockExplorerUrls: [],
        defaultBlockExplorerUrlIndex: undefined,
      }),
    );
  });

  it('handles network with failover RPC URLs', async () => {
    const mockNetwork = createMockNetwork({
      failoverRpcUrls: ['https://polygon-rpc-backup.com'],
    });

    const { result } = renderHook(() => useAddPopularNetwork());

    await act(async () => {
      await result.current.addPopularNetwork(mockNetwork);
    });

    expect(Engine.context.NetworkController.addNetwork).toHaveBeenCalledWith(
      expect.objectContaining({
        rpcEndpoints: [
          expect.objectContaining({
            failoverUrls: ['https://polygon-rpc-backup.com'],
          }),
        ],
      }),
    );
  });
});
