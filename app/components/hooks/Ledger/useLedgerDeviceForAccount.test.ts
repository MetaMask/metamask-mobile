import { renderHook } from '@testing-library/react-hooks';
import { InternalAccount } from '@metamask/keyring-internal-api';
import useLedgerDeviceForAccount from './useLedgerDeviceForAccount';
import useBluetoothDevices, { BluetoothDevice } from './useBluetoothDevices';
import useBluetoothPermissions from '../useBluetoothPermissions';
import useBluetooth from './useBluetooth';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { BluetoothPermissionErrors } from '../../../core/Ledger/ledgerErrors';

jest.mock('./useBluetoothDevices');
jest.mock('../useBluetoothPermissions');
jest.mock('./useBluetooth');

const mockUseBluetoothDevices = useBluetoothDevices as jest.MockedFunction<
  typeof useBluetoothDevices
>;
const mockUseBluetoothPermissions =
  useBluetoothPermissions as jest.MockedFunction<
    typeof useBluetoothPermissions
  >;
const mockUseBluetooth = useBluetooth as jest.MockedFunction<
  typeof useBluetooth
>;

describe('useLedgerDeviceForAccount', () => {
  const mockCheckPermissions = jest.fn();

  const createMockAccount = (
    keyringType: string = ExtendedKeyringTypes.hd,
  ): InternalAccount =>
    ({
      id: 'test-account-id',
      address: '0x123',
      metadata: {
        name: 'Test Account',
        keyring: {
          type: keyringType,
        },
      },
    }) as InternalAccount;

  const createMockDevice = (id = 'device-1'): BluetoothDevice => ({
    id,
    name: 'Ledger Nano X',
    serviceUUIDs: ['uuid-1'],
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseBluetoothPermissions.mockReturnValue({
      hasBluetoothPermissions: false,
      checkPermissions: mockCheckPermissions,
      bluetoothPermissionError: undefined,
    });

    mockUseBluetooth.mockReturnValue({
      bluetoothOn: false,
      bluetoothConnectionError: undefined,
    });

    mockUseBluetoothDevices.mockReturnValue({
      devices: [],
      deviceScanError: false,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('when account is not a Ledger account', () => {
    it('returns undefined for all Ledger-specific properties', () => {
      const account = createMockAccount(ExtendedKeyringTypes.hd);

      const { result } = renderHook(() => useLedgerDeviceForAccount(account));

      expect(result.current.ledgerDevice).toBeUndefined();
      expect(result.current.hasBluetoothPermissions).toBeUndefined();
      expect(result.current.bluetoothOn).toBeUndefined();
      expect(result.current.checkPermissions).toBeUndefined();
      expect(result.current.bluetoothPermissionError).toBeUndefined();
      expect(result.current.bluetoothConnectionError).toBeUndefined();
      expect(result.current.deviceScanError).toBeUndefined();
    });

    it('returns undefined when account has no keyring metadata', () => {
      const account = {
        id: 'test-account-id',
        address: '0x123',
        metadata: {},
      } as InternalAccount;

      const { result } = renderHook(() => useLedgerDeviceForAccount(account));

      expect(result.current.ledgerDevice).toBeUndefined();
      expect(result.current.hasBluetoothPermissions).toBeUndefined();
    });

    it('returns undefined when account keyring type is simple', () => {
      const account = createMockAccount(ExtendedKeyringTypes.simple);

      const { result } = renderHook(() => useLedgerDeviceForAccount(account));

      expect(result.current.ledgerDevice).toBeUndefined();
    });

    it('returns undefined when account keyring type is qr', () => {
      const account = createMockAccount(ExtendedKeyringTypes.qr);

      const { result } = renderHook(() => useLedgerDeviceForAccount(account));

      expect(result.current.ledgerDevice).toBeUndefined();
    });
  });

  describe('when account is a Ledger account', () => {
    describe('with available devices', () => {
      it('returns first device when one device is available', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        const mockDevice = createMockDevice();
        mockUseBluetoothDevices.mockReturnValue({
          devices: [mockDevice],
          deviceScanError: false,
        });
        mockUseBluetoothPermissions.mockReturnValue({
          hasBluetoothPermissions: true,
          checkPermissions: mockCheckPermissions,
          bluetoothPermissionError: undefined,
        });
        mockUseBluetooth.mockReturnValue({
          bluetoothOn: true,
          bluetoothConnectionError: false,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.ledgerDevice).toEqual(mockDevice);
        expect(result.current.hasBluetoothPermissions).toBe(true);
        expect(result.current.bluetoothOn).toBe(true);
      });

      it('returns first device when multiple devices are available', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        const device1 = createMockDevice('device-1');
        const device2 = createMockDevice('device-2');
        mockUseBluetoothDevices.mockReturnValue({
          devices: [device1, device2],
          deviceScanError: false,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.ledgerDevice).toEqual(device1);
      });

      it('returns checkPermissions function', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetoothPermissions.mockReturnValue({
          hasBluetoothPermissions: true,
          checkPermissions: mockCheckPermissions,
          bluetoothPermissionError: undefined,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.checkPermissions).toBe(mockCheckPermissions);
      });
    });

    describe('without available devices', () => {
      it('returns undefined for ledgerDevice when devices array is empty', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetoothDevices.mockReturnValue({
          devices: [],
          deviceScanError: false,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.ledgerDevice).toBeUndefined();
      });

      it('returns Bluetooth state even when no devices are found', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetoothPermissions.mockReturnValue({
          hasBluetoothPermissions: true,
          checkPermissions: mockCheckPermissions,
          bluetoothPermissionError: undefined,
        });
        mockUseBluetooth.mockReturnValue({
          bluetoothOn: true,
          bluetoothConnectionError: false,
        });
        mockUseBluetoothDevices.mockReturnValue({
          devices: [],
          deviceScanError: false,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.ledgerDevice).toBeUndefined();
        expect(result.current.hasBluetoothPermissions).toBe(true);
        expect(result.current.bluetoothOn).toBe(true);
      });
    });

    describe('permission states', () => {
      it('returns false when Bluetooth permissions are denied', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetoothPermissions.mockReturnValue({
          hasBluetoothPermissions: false,
          checkPermissions: mockCheckPermissions,
          bluetoothPermissionError:
            BluetoothPermissionErrors.BluetoothAccessBlocked,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.hasBluetoothPermissions).toBe(false);
        expect(result.current.bluetoothPermissionError).toBe(
          BluetoothPermissionErrors.BluetoothAccessBlocked,
        );
      });

      it('returns nearby devices permission error on Android 12+', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetoothPermissions.mockReturnValue({
          hasBluetoothPermissions: false,
          checkPermissions: mockCheckPermissions,
          bluetoothPermissionError:
            BluetoothPermissionErrors.NearbyDevicesAccessBlocked,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.bluetoothPermissionError).toBe(
          BluetoothPermissionErrors.NearbyDevicesAccessBlocked,
        );
      });

      it('returns location permission error on Android below 12', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetoothPermissions.mockReturnValue({
          hasBluetoothPermissions: false,
          checkPermissions: mockCheckPermissions,
          bluetoothPermissionError:
            BluetoothPermissionErrors.LocationAccessBlocked,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.bluetoothPermissionError).toBe(
          BluetoothPermissionErrors.LocationAccessBlocked,
        );
      });
    });

    describe('Bluetooth connection states', () => {
      it('returns true when Bluetooth is turned on', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetooth.mockReturnValue({
          bluetoothOn: true,
          bluetoothConnectionError: false,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.bluetoothOn).toBe(true);
        expect(result.current.bluetoothConnectionError).toBe(false);
      });

      it('returns false when Bluetooth is turned off', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetooth.mockReturnValue({
          bluetoothOn: false,
          bluetoothConnectionError: true,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.bluetoothOn).toBe(false);
        expect(result.current.bluetoothConnectionError).toBe(true);
      });

      it('returns undefined for Bluetooth connection error when not set', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetooth.mockReturnValue({
          bluetoothOn: false,
          bluetoothConnectionError: undefined,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.bluetoothConnectionError).toBeUndefined();
      });
    });

    describe('device scan errors', () => {
      it('returns true when device scan encounters an error', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetoothDevices.mockReturnValue({
          devices: [],
          deviceScanError: true,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.deviceScanError).toBe(true);
      });

      it('returns false when device scan completes without error', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetoothDevices.mockReturnValue({
          devices: [],
          deviceScanError: false,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.deviceScanError).toBe(false);
      });
    });

    describe('hook dependencies', () => {
      it('passes hasBluetoothPermissions to useBluetooth', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetoothPermissions.mockReturnValue({
          hasBluetoothPermissions: true,
          checkPermissions: mockCheckPermissions,
          bluetoothPermissionError: undefined,
        });

        renderHook(() => useLedgerDeviceForAccount(account));

        expect(mockUseBluetooth).toHaveBeenCalledWith(true);
      });

      it('passes hasBluetoothPermissions and bluetoothOn to useBluetoothDevices', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetoothPermissions.mockReturnValue({
          hasBluetoothPermissions: true,
          checkPermissions: mockCheckPermissions,
          bluetoothPermissionError: undefined,
        });
        mockUseBluetooth.mockReturnValue({
          bluetoothOn: true,
          bluetoothConnectionError: false,
        });

        renderHook(() => useLedgerDeviceForAccount(account));

        expect(mockUseBluetoothDevices).toHaveBeenCalledWith(true, true);
      });

      it('passes false values when permissions are denied', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetoothPermissions.mockReturnValue({
          hasBluetoothPermissions: false,
          checkPermissions: mockCheckPermissions,
          bluetoothPermissionError:
            BluetoothPermissionErrors.BluetoothAccessBlocked,
        });

        renderHook(() => useLedgerDeviceForAccount(account));

        expect(mockUseBluetooth).toHaveBeenCalledWith(false);
      });
    });

    describe('complete error scenario', () => {
      it('returns all error states when everything fails', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        mockUseBluetoothPermissions.mockReturnValue({
          hasBluetoothPermissions: false,
          checkPermissions: mockCheckPermissions,
          bluetoothPermissionError:
            BluetoothPermissionErrors.BluetoothAccessBlocked,
        });
        mockUseBluetooth.mockReturnValue({
          bluetoothOn: false,
          bluetoothConnectionError: true,
        });
        mockUseBluetoothDevices.mockReturnValue({
          devices: [],
          deviceScanError: true,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.ledgerDevice).toBeUndefined();
        expect(result.current.hasBluetoothPermissions).toBe(false);
        expect(result.current.bluetoothOn).toBe(false);
        expect(result.current.bluetoothPermissionError).toBe(
          BluetoothPermissionErrors.BluetoothAccessBlocked,
        );
        expect(result.current.bluetoothConnectionError).toBe(true);
        expect(result.current.deviceScanError).toBe(true);
      });
    });

    describe('complete success scenario', () => {
      it('returns all success states when everything works', () => {
        const account = createMockAccount(ExtendedKeyringTypes.ledger);
        const mockDevice = createMockDevice();
        mockUseBluetoothPermissions.mockReturnValue({
          hasBluetoothPermissions: true,
          checkPermissions: mockCheckPermissions,
          bluetoothPermissionError: undefined,
        });
        mockUseBluetooth.mockReturnValue({
          bluetoothOn: true,
          bluetoothConnectionError: false,
        });
        mockUseBluetoothDevices.mockReturnValue({
          devices: [mockDevice],
          deviceScanError: false,
        });

        const { result } = renderHook(() => useLedgerDeviceForAccount(account));

        expect(result.current.ledgerDevice).toEqual(mockDevice);
        expect(result.current.hasBluetoothPermissions).toBe(true);
        expect(result.current.bluetoothOn).toBe(true);
        expect(result.current.checkPermissions).toBe(mockCheckPermissions);
        expect(result.current.bluetoothPermissionError).toBeUndefined();
        expect(result.current.bluetoothConnectionError).toBe(false);
        expect(result.current.deviceScanError).toBe(false);
      });
    });
  });
});
