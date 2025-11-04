import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { useSDKV2Connection } from './useSDKV2Connection';
import { ConnectionProps } from '../../../core/SDKConnect/Connection';
import { AnyAction, Store } from 'redux';

const mockStore = configureMockStore();

const mockV2Connection: ConnectionProps & { isV2?: boolean } = {
  id: 'test-connection-id',
  otherPublicKey: 'test-public-key',
  origin: 'https://test-dapp.com',
  isV2: true,
  originatorInfo: {
    dappId: 'test-dapp-id',
    title: 'Test DApp',
    url: 'https://test-dapp.com',
    icon: 'https://test-dapp.com/icon.png',
    platform: 'web',
  },
  connected: true,
  validUntil: Date.now() + 86400000, // 24 hours from now
};

const mockV1Connection: ConnectionProps & { isV2?: boolean } = {
  id: 'test-v1-connection-id',
  otherPublicKey: 'test-v1-public-key',
  origin: 'https://test-v1-dapp.com',
  isV2: false,
  originatorInfo: {
    dappId: 'test-dapp-id',
    title: 'Test V1 DApp',
    url: 'https://test-v1-dapp.com',
    icon: 'https://test-v1-dapp.com/icon.png',
    platform: 'web',
  },
  connected: true,
  validUntil: Date.now() + 86400000,
};

const createMockState = (
  v2Connections: Record<string, ConnectionProps & { isV2?: boolean }>,
) => ({
  sdk: {
    connections: {},
    approvedHosts: {},
    dappConnections: {},
    v2Connections,
  },
});

const Wrapper = ({
  children,
  store,
}: {
  children: React.ReactNode;
  store: Store<unknown, AnyAction>;
}) => <Provider store={store}>{children}</Provider>;

describe('useSDKV2Connection', () => {
  it('should return connection data for v2 connection', () => {
    const mockState = createMockState({
      'https://test-dapp.com': mockV2Connection,
    });
    const store = mockStore(mockState);

    const { result } = renderHook(
      () => useSDKV2Connection('https://test-dapp.com'),
      {
        wrapper: ({ children }) => <Wrapper store={store}>{children}</Wrapper>,
      },
    );

    expect(result.current).toEqual(mockV2Connection);
  });

  it('should return connection data for v1 connection', () => {
    const mockState = createMockState({
      'https://test-v1-dapp.com': mockV1Connection,
    });
    const store = mockStore(mockState);

    const { result } = renderHook(
      () => useSDKV2Connection('https://test-v1-dapp.com'),
      {
        wrapper: ({ children }) => <Wrapper store={store}>{children}</Wrapper>,
      },
    );

    expect(result.current).toEqual(mockV1Connection);
  });

  it('should return undefined for non-existent origin', () => {
    const mockState = createMockState({
      'https://test-dapp.com': mockV2Connection,
    });
    const store = mockStore(mockState);

    const { result } = renderHook(
      () => useSDKV2Connection('https://non-existent.com'),
      {
        wrapper: ({ children }) => <Wrapper store={store}>{children}</Wrapper>,
      },
    );

    expect(result.current).toBeUndefined();
  });

  it('should return undefined for undefined origin', () => {
    const mockState = createMockState({
      'https://test-dapp.com': mockV2Connection,
    });
    const store = mockStore(mockState);

    const { result } = renderHook(() => useSDKV2Connection(undefined), {
      wrapper: ({ children }) => <Wrapper store={store}>{children}</Wrapper>,
    });

    expect(result.current).toBeUndefined();
  });

  it('should return undefined for empty string origin', () => {
    const mockState = createMockState({
      'https://test-dapp.com': mockV2Connection,
    });
    const store = mockStore(mockState);

    const { result } = renderHook(() => useSDKV2Connection(''), {
      wrapper: ({ children }) => <Wrapper store={store}>{children}</Wrapper>,
    });

    expect(result.current).toBeUndefined();
  });

  it('should handle connection without isV2 property', () => {
    const connectionWithoutIsV2: ConnectionProps = {
      id: 'test-connection-id',
      otherPublicKey: 'test-public-key',
      origin: 'https://test-dapp.com',
      originatorInfo: {
        dappId: 'test-dapp-id',
        title: 'Test DApp',
        url: 'https://test-dapp.com',
        icon: 'https://test-dapp.com/icon.png',
        platform: 'web',
      },
      connected: true,
      validUntil: Date.now() + 86400000,
    };

    const mockState = createMockState({
      'https://test-dapp.com': connectionWithoutIsV2,
    });
    const store = mockStore(mockState);

    const { result } = renderHook(
      () => useSDKV2Connection('https://test-dapp.com'),
      {
        wrapper: ({ children }) => <Wrapper store={store}>{children}</Wrapper>,
      },
    );

    expect(result.current).toEqual(connectionWithoutIsV2);
  });

  it('should handle empty v2Connections object', () => {
    const mockState = createMockState({});
    const store = mockStore(mockState);

    const { result } = renderHook(
      () => useSDKV2Connection('https://test-dapp.com'),
      {
        wrapper: ({ children }) => <Wrapper store={store}>{children}</Wrapper>,
      },
    );

    expect(result.current).toBeUndefined();
  });

  it('should handle multiple connections and return correct one', () => {
    const mockState = createMockState({
      'https://test-dapp.com': mockV2Connection,
      'https://test-v1-dapp.com': mockV1Connection,
      'https://another-dapp.com': {
        ...mockV2Connection,
        id: 'another-connection-id',
        origin: 'https://another-dapp.com',
        originatorInfo: {
          dappId: 'another-dapp-id',
          title: 'Another DApp',
          url: 'https://another-dapp.com',
          icon: 'https://another-dapp.com/icon.png',
          platform: 'web',
        },
      },
    });
    const store = mockStore(mockState);

    const { result } = renderHook(
      () => useSDKV2Connection('https://test-v1-dapp.com'),
      {
        wrapper: ({ children }) => <Wrapper store={store}>{children}</Wrapper>,
      },
    );

    expect(result.current).toEqual(mockV1Connection);
  });
});
