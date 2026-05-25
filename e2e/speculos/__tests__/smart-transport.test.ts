jest.mock('react-native-device-info', () => ({
  isEmulatorSync: jest.fn(),
}));

jest.mock('@ledgerhq/react-native-hw-transport-ble', () => ({
  default: {
    open: jest.fn(),
    listen: jest.fn(() => ({ unsubscribe: jest.fn() })),
    observeState: jest.fn(() => ({ unsubscribe: jest.fn() })),
    disconnectDevice: jest.fn(),
  },
}));

import DeviceInfo from 'react-native-device-info';
import RealTransportBLE from '@ledgerhq/react-native-hw-transport-ble';

const mockIsEmulatorSync = DeviceInfo.isEmulatorSync as jest.Mock;
const mockRealOpen = RealTransportBLE.open as jest.Mock;
const mockRealListen = RealTransportBLE.listen as jest.Mock;
const mockRealObserveState = RealTransportBLE.observeState as jest.Mock;
const mockRealDisconnect = RealTransportBLE.disconnectDevice as jest.Mock;

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function loadSmartTransport(fetchMock: typeof fetch) {
  (globalThis as any).fetch = fetchMock;
  let SmartTransport: typeof import('../mocks/SmartTransport').default;
  jest.isolateModules(() => {
    SmartTransport = require('../mocks/SmartTransport').default;
  });
  return SmartTransport!;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SmartTransport', () => {
  describe('Scenario 1: Physical device (isEmulatorSync returns false)', () => {
    let SmartTransport: typeof import('../mocks/SmartTransport').default;

    beforeEach(() => {
      mockIsEmulatorSync.mockReturnValue(false);
      SmartTransport = loadSmartTransport(jest.fn());
    });

    it('open() delegates to RealTransportBLE.open', async () => {
      const fakeTransport = { exchange: jest.fn() };
      mockRealOpen.mockResolvedValue(fakeTransport);

      const result = await SmartTransport.open('device-123');

      expect(mockRealOpen).toHaveBeenCalledWith('device-123');
      expect(result).toBe(fakeTransport);
    });

    it('listen() delegates to RealTransportBLE.listen', async () => {
      const observer = { next: jest.fn() };
      SmartTransport.listen(observer);
      await flushPromises();

      expect(mockRealListen).toHaveBeenCalledWith(observer);
    });

    it('observeState() delegates to RealTransportBLE.observeState', async () => {
      const observer = { next: jest.fn() };
      SmartTransport.observeState(observer);
      await flushPromises();

      expect(mockRealObserveState).toHaveBeenCalledWith(observer);
    });

    it('disconnectDevice() delegates to RealTransportBLE.disconnectDevice', async () => {
      await SmartTransport.disconnectDevice('device-123');

      expect(mockRealDisconnect).toHaveBeenCalledWith('device-123');
    });
  });

  describe('Scenario 2: Simulator + Speculos running (fetch succeeds)', () => {
    let SmartTransport: typeof import('../mocks/SmartTransport').default;

    beforeEach(() => {
      mockIsEmulatorSync.mockReturnValue(true);
      const fetchOk = jest.fn().mockResolvedValue({ ok: true });
      SmartTransport = loadSmartTransport(fetchOk);
    });

    it('open() returns a SpeculosHttpTransport instance', async () => {
      const result = await SmartTransport.open('device-123');

      expect(mockRealOpen).not.toHaveBeenCalled();
      expect(result.constructor.name).toBe('SpeculosHttpTransport');
    });

    it('listen() emits a fake Speculos device', async () => {
      const events: any[] = [];
      const observer = { next: (e: any) => events.push(e) };

      SmartTransport.listen(observer);
      await new Promise((r) => setTimeout(r, 300));

      expect(mockRealListen).not.toHaveBeenCalled();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('add');
      expect(events[0].descriptor.id).toBe('speculos-virtual-ledger');
    });

    it('observeState() emits PoweredOn', async () => {
      const events: any[] = [];
      const observer = { next: (e: any) => events.push(e) };

      SmartTransport.observeState(observer);
      await new Promise((r) => setTimeout(r, 50));

      expect(mockRealObserveState).not.toHaveBeenCalled();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'PoweredOn', available: true });
    });

    it('disconnectDevice() is a no-op in speculos mode', async () => {
      await SmartTransport.disconnectDevice('device-123');

      expect(mockRealDisconnect).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 3: Simulator + no Speculos (fetch fails)', () => {
    let SmartTransport: typeof import('../mocks/SmartTransport').default;

    beforeEach(() => {
      mockIsEmulatorSync.mockReturnValue(true);
      const fetchFail = jest.fn().mockRejectedValue(new Error('Connection refused'));
      SmartTransport = loadSmartTransport(fetchFail);
    });

    it('open() falls back to RealTransportBLE.open', async () => {
      const fakeTransport = { exchange: jest.fn() };
      mockRealOpen.mockResolvedValue(fakeTransport);

      const result = await SmartTransport.open('device-123');

      expect(mockRealOpen).toHaveBeenCalledWith('device-123');
      expect(result).toBe(fakeTransport);
    });

    it('listen() delegates to RealTransportBLE.listen', async () => {
      const observer = { next: jest.fn() };
      SmartTransport.listen(observer);
      await flushPromises();

      expect(mockRealListen).toHaveBeenCalledWith(observer);
    });

    it('observeState() delegates to RealTransportBLE.observeState', async () => {
      const observer = { next: jest.fn() };
      SmartTransport.observeState(observer);
      await flushPromises();

      expect(mockRealObserveState).toHaveBeenCalledWith(observer);
    });

    it('disconnectDevice() delegates to RealTransportBLE.disconnectDevice', async () => {
      await SmartTransport.disconnectDevice('device-123');

      expect(mockRealDisconnect).toHaveBeenCalledWith('device-123');
    });
  });
});
