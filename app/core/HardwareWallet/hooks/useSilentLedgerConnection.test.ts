import { renderHook, act } from '@testing-library/react-native';

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockDestroy = jest.fn();
const mockIsConnected = jest.fn();

jest.mock('../adapters/factory', () => ({
  createAdapter: jest.fn(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    destroy: mockDestroy,
    isConnected: mockIsConnected,
  })),
}));

const mockGetDeviceId = jest.fn();

jest.mock('../../Ledger/Ledger', () => ({
  getDeviceId: () => mockGetDeviceId(),
}));

import { useSilentLedgerConnection } from './useSilentLedgerConnection';

describe('useSilentLedgerConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockIsConnected.mockReturnValue(true);
    mockGetDeviceId.mockResolvedValue('test-device-id');
  });

  it('returns "connected" when device is reachable', async () => {
    const { result } = renderHook(() => useSilentLedgerConnection());

    let connectionResult: string | undefined;
    await act(async () => {
      connectionResult = await result.current.checkConnection();
    });

    expect(connectionResult).toBe('connected');
    expect(mockConnect).toHaveBeenCalledWith('test-device-id');
  });

  it('returns "disconnected" when connection fails', async () => {
    mockConnect.mockRejectedValue(new Error('Device not found'));

    const { result } = renderHook(() => useSilentLedgerConnection());

    let connectionResult: string | undefined;
    await act(async () => {
      connectionResult = await result.current.checkConnection();
    });

    expect(connectionResult).toBe('disconnected');
  });

  it('returns "disconnected" when getDeviceId returns null', async () => {
    mockGetDeviceId.mockResolvedValue(null);

    const { result } = renderHook(() => useSilentLedgerConnection());

    let connectionResult: string | undefined;
    await act(async () => {
      connectionResult = await result.current.checkConnection();
    });

    expect(connectionResult).toBe('disconnected');
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('returns "disconnected" on timeout', async () => {
    jest.useFakeTimers();
    mockConnect.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useSilentLedgerConnection());

    let connectionResult: string | undefined;
    const promise = act(async () => {
      connectionResult = await result.current.checkConnection();
    });

    await jest.advanceTimersByTimeAsync(6000);
    await promise;

    expect(connectionResult).toBe('disconnected');
    jest.useRealTimers();
  });

  it('destroys adapter after check', async () => {
    const { result } = renderHook(() => useSilentLedgerConnection());

    await act(async () => {
      await result.current.checkConnection();
    });

    expect(mockDestroy).toHaveBeenCalled();
  });

  it('destroys adapter even when connection fails', async () => {
    mockConnect.mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => useSilentLedgerConnection());

    await act(async () => {
      await result.current.checkConnection();
    });

    expect(mockDestroy).toHaveBeenCalled();
  });
});
