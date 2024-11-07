import { renderHook } from '@testing-library/react-hooks';
import useBluetoothDevices from './useBluetoothDevices';
import { Observable } from 'rxjs';

describe('useBluetoothDevices', () => {
  let subscribeMock: jest.Mock;

  beforeEach(() => {
    subscribeMock = jest.fn();
    jest.spyOn(Observable.prototype, 'subscribe').mockImplementation(subscribeMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty devices and no error when permissions are false', () => {
    const { result } = renderHook(() => useBluetoothDevices(false, true));

    expect(result.current.devices).toEqual([]);
    expect(result.current.deviceScanError).toBe(false);
  });

  it('returns empty devices and no error when bluetooth is off', () => {
    const { result } = renderHook(() => useBluetoothDevices(true, false));

    expect(result.current.devices).toEqual([]);
    expect(result.current.deviceScanError).toBe(false);
  });

  it('returns expected device and no error when permissions and bluetooth are on and devices scan return devices', async () => {

    const expectedDevice1 = {
      id: '1',
      name: 'Device 1',
    };

    // Mock `listen` to simulate device discovery
    subscribeMock.mockImplementation(({ next }) => {
      next({
        type: 'add',
        descriptor: expectedDevice1,
      });
    });
    const { result } = renderHook(() => useBluetoothDevices(true, true));

    expect(result.current.devices).toEqual([expectedDevice1]);
    expect(result.current.deviceScanError).toBe(false);
  });

  it('returns error when device scan fails', async () => {
    // Mock `listen` to simulate device discovery
    subscribeMock.mockImplementation(({ error }) => {
      error('Error');
    });
    const { result } = renderHook(() => useBluetoothDevices(true, true));

    expect(result.current.devices).toEqual([]);
    expect(result.current.deviceScanError).toBe(true);
  });
});
