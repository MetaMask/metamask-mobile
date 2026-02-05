import { act, renderHook } from '@testing-library/react-hooks';
import useAuthCapabilities from './useAuthCapabilities';
import { Authentication } from '../Authentication';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { AuthCapabilities } from '../types';

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
  SecurityLevel: {
    NONE: 0,
    SECRET: 1,
    BIOMETRIC_WEAK: 2,
    BIOMETRIC_STRONG: 3,
  },
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  getEnrolledLevelAsync: jest.fn(),
}));

// Mock react-redux
const mockDispatch = jest.fn();
let mockOsAuthEnabled = true;

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) =>
    selector({ security: { osAuthEnabled: mockOsAuthEnabled } }),
  ),
  useDispatch: () => mockDispatch,
}));

// Mock Authentication
const mockGetAuthCapabilities = jest.fn<Promise<AuthCapabilities>, [boolean]>();

describe('useAuthCapabilities', () => {
  let getAuthCapabilitiesSpy: jest.SpyInstance;

  const mockCapabilities: AuthCapabilities = {
    isBiometricsAvailable: true,
    biometricsDisabledOnOS: false,
    isAuthToggleVisible: true,
    authToggleLabel: 'Face ID',
    osAuthEnabled: true,
    authStorageType: AUTHENTICATION_TYPE.BIOMETRIC,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOsAuthEnabled = true;
    getAuthCapabilitiesSpy = jest
      .spyOn(Authentication, 'getAuthCapabilities')
      .mockImplementation(mockGetAuthCapabilities);
    mockGetAuthCapabilities.mockResolvedValue(mockCapabilities);
  });

  afterEach(() => {
    getAuthCapabilitiesSpy.mockRestore();
  });

  it('returns active loading state and empty capabilities when hook is mounted', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useAuthCapabilities(),
    );

    // Initially loading (synchronous check before async completes)
    expect(result.current.isLoading).toBe(true);
    expect(result.current.capabilities).toBeNull();
    expect(typeof result.current.refresh).toBe('function');
    expect(typeof result.current.updateOsAuthEnabled).toBe('function');

    // Wait for async updates to complete to avoid act warnings
    await act(async () => {
      await waitForNextUpdate();
    });
  });

  it('returns inactive loading state and populated capabilities after fetching auth capabilities completes', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useAuthCapabilities(),
    );

    mockOsAuthEnabled = true;

    // Initially null
    expect(result.current.isLoading).toBe(true);
    expect(result.current.capabilities).toBeNull();

    // Wait for async update within act
    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current.capabilities).toEqual(mockCapabilities);
    expect(result.current.isLoading).toBe(false);

    expect(getAuthCapabilitiesSpy).toHaveBeenCalledTimes(1);
    expect(getAuthCapabilitiesSpy).toHaveBeenCalledWith(mockOsAuthEnabled);
  });

  it('returns default capabilities on error', async () => {
    mockGetAuthCapabilities.mockRejectedValue(new Error('Test error'));
    mockOsAuthEnabled = true;

    const { result, waitForNextUpdate } = renderHook(() =>
      useAuthCapabilities(),
    );

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current.capabilities).toEqual({
      isBiometricsAvailable: false,
      biometricsDisabledOnOS: false,
      isAuthToggleVisible: false,
      authToggleLabel: '',
      osAuthEnabled: true,
      authStorageType: AUTHENTICATION_TYPE.PASSWORD,
    });

    expect(getAuthCapabilitiesSpy).toHaveBeenCalledTimes(1);
    expect(getAuthCapabilitiesSpy).toHaveBeenCalledWith(mockOsAuthEnabled);
  });

  it('calls getAuthCapabilities again when refresh is called', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useAuthCapabilities(),
    );

    await act(async () => {
      await waitForNextUpdate();
    });
    expect(getAuthCapabilitiesSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(getAuthCapabilitiesSpy).toHaveBeenCalledTimes(2);
  });

  it('updates capabilities after refresh', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useAuthCapabilities(),
    );

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current.capabilities).toEqual(mockCapabilities);

    const updatedCapabilities: AuthCapabilities = {
      ...mockCapabilities,
      authToggleLabel: 'Touch ID',
    };
    mockGetAuthCapabilities.mockResolvedValue(updatedCapabilities);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.capabilities).toEqual(updatedCapabilities);
  });

  it('dispatches setOsAuthEnabled with true when currently false', async () => {
    mockOsAuthEnabled = false;
    const { result, waitForNextUpdate } = renderHook(() =>
      useAuthCapabilities(),
    );

    await act(async () => {
      await waitForNextUpdate();
    });

    act(() => {
      result.current.updateOsAuthEnabled();
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_OS_AUTH_ENABLED',
      enabled: !mockOsAuthEnabled, // Toggled from false to true
    });
  });
});
