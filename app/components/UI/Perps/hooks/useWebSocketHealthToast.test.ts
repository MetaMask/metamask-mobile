import { renderHook, act } from '@testing-library/react-hooks';
import { useWebSocketHealthToast } from './useWebSocketHealthToast';
import { usePerpsConnection } from './usePerpsConnection';
import usePerpsToasts from './usePerpsToasts';
import Engine from '../../../../core/Engine';
import { WebSocketConnectionState } from '../controllers/types';

// Mock the dependencies
jest.mock('./usePerpsConnection');
jest.mock('./usePerpsToasts');

// Store the subscription listener so we can trigger it in tests
let connectionStateListener: ((state: WebSocketConnectionState) => void) | null =
  null;
const mockUnsubscribe = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      subscribeToConnectionState: jest.fn((listener) => {
        connectionStateListener = listener;
        return mockUnsubscribe;
      }),
    },
  },
}));

const mockUsePerpsConnection = usePerpsConnection as jest.MockedFunction<
  typeof usePerpsConnection
>;

const mockUsePerpsToasts = usePerpsToasts as jest.MockedFunction<
  typeof usePerpsToasts
>;

describe('useWebSocketHealthToast', () => {
  const mockShowToast = jest.fn();
  const mockDisconnectedToast = { labelOptions: [{ label: 'Disconnected' }] };
  const mockConnectingToast = { labelOptions: [{ label: 'Connecting' }] };
  const mockConnectedToast = { labelOptions: [{ label: 'Connected' }] };

  beforeEach(() => {
    jest.clearAllMocks();
    connectionStateListener = null;

    mockUsePerpsToasts.mockReturnValue({
      showToast: mockShowToast,
      PerpsToastOptions: {
        websocketHealth: {
          disconnected: mockDisconnectedToast,
          connecting: mockConnectingToast,
          connected: mockConnectedToast,
        },
      } as ReturnType<typeof usePerpsToasts>['PerpsToastOptions'],
    });
  });

  it('does not show any toast on initial connection', () => {
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });

    renderHook(() => useWebSocketHealthToast());

    act(() => {
      connectionStateListener?.(WebSocketConnectionState.CONNECTED);
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('shows disconnected toast when WebSocket health check detects disconnection', () => {
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });

    renderHook(() => useWebSocketHealthToast());

    act(() => {
      connectionStateListener?.(WebSocketConnectionState.CONNECTED);
    });

    expect(mockShowToast).not.toHaveBeenCalled();

    act(() => {
      connectionStateListener?.(WebSocketConnectionState.DISCONNECTED);
    });

    expect(mockShowToast).toHaveBeenCalledWith(mockDisconnectedToast);
  });

  it('shows connected toast when WebSocket connection is restored', () => {
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });

    renderHook(() => useWebSocketHealthToast());

    // First callback - connected (establishes initial state)
    act(() => {
      connectionStateListener?.(WebSocketConnectionState.CONNECTED);
    });

    // Simulate disconnection
    act(() => {
      connectionStateListener?.(WebSocketConnectionState.DISCONNECTED);
    });

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(mockDisconnectedToast);

    // Simulate reconnection
    act(() => {
      connectionStateListener?.(WebSocketConnectionState.CONNECTED);
    });

    expect(mockShowToast).toHaveBeenCalledTimes(2);
    expect(mockShowToast).toHaveBeenLastCalledWith(mockConnectedToast);
  });

  it('shows connecting toast when WebSocket is reconnecting after disconnection', () => {
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });

    renderHook(() => useWebSocketHealthToast());

    // Establish initial connected state
    act(() => {
      connectionStateListener?.(WebSocketConnectionState.CONNECTED);
    });

    // Simulate disconnection
    act(() => {
      connectionStateListener?.(WebSocketConnectionState.DISCONNECTED);
    });

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(mockDisconnectedToast);

    // Simulate reconnecting state
    act(() => {
      connectionStateListener?.(WebSocketConnectionState.CONNECTING);
    });

    expect(mockShowToast).toHaveBeenCalledTimes(2);
    expect(mockShowToast).toHaveBeenLastCalledWith(mockConnectingToast);

    // Simulate successful reconnection
    act(() => {
      connectionStateListener?.(WebSocketConnectionState.CONNECTED);
    });

    expect(mockShowToast).toHaveBeenCalledTimes(3);
    expect(mockShowToast).toHaveBeenLastCalledWith(mockConnectedToast);
  });

  it('does not subscribe when not connected via PerpsConnectionManager', () => {
    mockUsePerpsConnection.mockReturnValue({
      isConnected: false,
      isInitialized: false,
      isConnecting: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });

    renderHook(() => useWebSocketHealthToast());

    expect(connectionStateListener).toBeNull();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does not show toast when WebSocket state does not change', () => {
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });

    renderHook(() => useWebSocketHealthToast());

    act(() => {
      connectionStateListener?.(WebSocketConnectionState.CONNECTED);
      connectionStateListener?.(WebSocketConnectionState.CONNECTED);
      connectionStateListener?.(WebSocketConnectionState.CONNECTED);
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('unsubscribes when component unmounts', () => {
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });

    const { unmount } = renderHook(() => useWebSocketHealthToast());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
