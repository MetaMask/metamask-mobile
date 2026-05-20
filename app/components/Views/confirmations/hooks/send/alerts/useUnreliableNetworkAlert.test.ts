import { renderHook, act } from '@testing-library/react-hooks';
import { NetworkStatus } from '@metamask/network-controller';

import Routes from '../../../../../../constants/navigation/Routes';
import { useSendContext } from '../../../context/send-context/send-context';
import { useUnreliableNetworkAlert } from './useUnreliableNetworkAlert';

const RPC_URL = 'https://mainnet.example/rpc';
const NETWORK_CLIENT_ID = 'mainnet-client';

const buildState = (status: NetworkStatus | undefined) => ({
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            name: 'Ethereum',
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [
              { url: RPC_URL, networkClientId: NETWORK_CLIENT_ID },
            ],
          },
        },
        networksMetadata:
          status === undefined
            ? {}
            : {
                [NETWORK_CLIENT_ID]: { status, EIPS: {} },
              },
      },
    },
  },
});

let mockReduxState: ReturnType<typeof buildState> = buildState(undefined);
const mockNavigate = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector(mockReduxState),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../context/send-context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string, substitutions?: Record<string, string>) =>
    substitutions ? `${key}::${Object.values(substitutions).join(',')}` : key,
}));

const mockUseSendContext = jest.mocked(useSendContext);
const mockSendContext = (chainId: string | undefined) => {
  mockUseSendContext.mockReturnValue({
    chainId,
  } as unknown as ReturnType<typeof useSendContext>);
};

describe('useUnreliableNetworkAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null alert when chainId is missing', () => {
    mockSendContext(undefined);
    mockReduxState = buildState(NetworkStatus.Unavailable);

    const { result } = renderHook(() => useUnreliableNetworkAlert());

    expect(result.current.alert).toBeNull();
  });

  it('returns null alert when chainId is not hex (non-EVM)', () => {
    mockSendContext('bip122:000000000019d6689c085ae165831e93');
    mockReduxState = buildState(NetworkStatus.Unavailable);

    const { result } = renderHook(() => useUnreliableNetworkAlert());

    expect(result.current.alert).toBeNull();
  });

  it('returns null alert when network configuration is missing', () => {
    mockSendContext('0xdeadbeef');
    mockReduxState = buildState(NetworkStatus.Unavailable);

    const { result } = renderHook(() => useUnreliableNetworkAlert());

    expect(result.current.alert).toBeNull();
  });

  it('returns null alert when network status is Available', () => {
    mockSendContext('0x1');
    mockReduxState = buildState(NetworkStatus.Available);

    const { result } = renderHook(() => useUnreliableNetworkAlert());

    expect(result.current.alert).toBeNull();
  });

  it('returns null alert when network status is undefined', () => {
    mockSendContext('0x1');
    mockReduxState = buildState(undefined);

    const { result } = renderHook(() => useUnreliableNetworkAlert());

    expect(result.current.alert).toBeNull();
  });

  it('returns an alert when network status is not Available', () => {
    mockSendContext('0x1');
    mockReduxState = buildState(NetworkStatus.Unavailable);

    const { result } = renderHook(() => useUnreliableNetworkAlert());

    expect(result.current.alert).toEqual({
      key: 'unreliableNetwork',
      title: 'send.unavailable_network_connection',
      message: 'send.unavailable_network_connection_description::Ethereum',
      acknowledgeButtonLabel: 'send.update',
    });
  });

  it('navigateToEditNetwork calls navigation with rpcUrl and EDIT_NETWORK route', () => {
    mockSendContext('0x1');
    mockReduxState = buildState(NetworkStatus.Unavailable);

    const { result } = renderHook(() => useUnreliableNetworkAlert());

    act(() => {
      result.current.navigateToEditNetwork();
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.EDIT_NETWORK, {
      network: RPC_URL,
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });
  });

  it('navigateToEditNetwork is a no-op when chainId is not hex', () => {
    mockSendContext('bip122:000000000019d6689c085ae165831e93');
    mockReduxState = buildState(NetworkStatus.Unavailable);

    const { result } = renderHook(() => useUnreliableNetworkAlert());

    act(() => {
      result.current.navigateToEditNetwork();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
