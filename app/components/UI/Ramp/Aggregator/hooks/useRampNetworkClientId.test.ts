import { act } from '@testing-library/react-native';
import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../../../util/test/network';
import { RpcEndpointType } from '@metamask/network-controller';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import useRampNetworkClientId from './useRampNetworkClientId';

const BASE_CHAIN_ID = '0x2105';

function buildNetworkState(defaultBaseEndpointIndex = 0) {
  const networkState = mockNetworkState(
    {
      chainId: '0x1',
      id: 'mainnet',
      nickname: 'Ethereum Mainnet',
      ticker: 'ETH',
    },
    {
      chainId: BASE_CHAIN_ID,
      id: 'base-a',
      nickname: 'Base',
      ticker: 'ETH',
    },
  );

  const baseConfig = networkState.networkConfigurationsByChainId[BASE_CHAIN_ID];

  networkState.networkConfigurationsByChainId[BASE_CHAIN_ID] = {
    ...baseConfig,
    defaultRpcEndpointIndex: defaultBaseEndpointIndex,
    rpcEndpoints: [
      baseConfig.rpcEndpoints[0],
      {
        networkClientId: 'base-b',
        type: RpcEndpointType.Custom,
        url: 'https://localhost/rpc/base-b',
      },
    ],
  };

  return networkState;
}

function buildState(networkState = buildNetworkState()) {
  return merge(
    {},
    { engine: { backgroundState } },
    {
      engine: { backgroundState: { NetworkController: networkState } },
    },
  );
}

function renderUseRampNetworkClientId(
  chainId: string | undefined,
  state = buildState(),
) {
  return renderHookWithProvider(() => useRampNetworkClientId(chainId), {
    state,
  });
}

describe('useRampNetworkClientId', () => {
  afterEach(() => {
    const engineWithState = Engine as unknown as {
      state?: Record<string, unknown>;
    };
    delete engineWithState.state;
  });

  it('resolves a numeric chain id to the default endpoint', () => {
    const { result } = renderUseRampNetworkClientId('1');

    expect(result.current).toBe('mainnet');
  });

  it('resolves a CAIP-2 chain id', () => {
    const { result } = renderUseRampNetworkClientId('eip155:1');

    expect(result.current).toBe('mainnet');
  });

  it('uses defaultRpcEndpointIndex', () => {
    const { result } = renderUseRampNetworkClientId(
      BASE_CHAIN_ID,
      buildState(buildNetworkState(1)),
    );

    expect(result.current).toBe('base-b');
  });

  it('returns undefined for unknown, missing and non-EVM chains', () => {
    const unknown = renderUseRampNetworkClientId('eip155:999999');
    const missing = renderUseRampNetworkClientId(undefined);
    const nonEvm = renderUseRampNetworkClientId(
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    );

    expect(unknown.result.current).toBeUndefined();
    expect(missing.result.current).toBeUndefined();
    expect(nonEvm.result.current).toBeUndefined();
  });

  it('returns the new id after the default endpoint changes', () => {
    const networkState = buildNetworkState();
    const { result, store } = renderUseRampNetworkClientId(
      BASE_CHAIN_ID,
      buildState(networkState),
    );

    expect(result.current).toBe('base-a');

    const updatedNetworkState = {
      ...networkState,
      networkConfigurationsByChainId: {
        ...networkState.networkConfigurationsByChainId,
        [BASE_CHAIN_ID]: {
          ...networkState.networkConfigurationsByChainId[BASE_CHAIN_ID],
          defaultRpcEndpointIndex: 1,
        },
      },
    };

    const engineWithState = Engine as unknown as {
      state?: Record<string, unknown>;
    };
    engineWithState.state = {
      ...(engineWithState.state ?? {}),
      NetworkController: updatedNetworkState,
    };

    act(() => {
      store.dispatch(updateBgState({ key: 'NetworkController' }));
    });

    expect(result.current).toBe('base-b');
  });
});
