import { act, renderHook } from '@testing-library/react-hooks';
import useAuthCapabilities from './useAuthCapabilities';
import { Authentication } from '../Authentication';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { AuthCapabilities } from '../types';

// Mock react-redux
let mockOsAuthEnabled = true;
let mockAllowLoginWithRememberMe = false;

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) =>
    selector({
      security: {
        osAuthEnabled: mockOsAuthEnabled,
        allowLoginWithRememberMe: mockAllowLoginWithRememberMe,
      },
    }),
  ),
}));

// Mock Authentication
const mockGetAuthCapabilities = jest.fn<
  Promise<AuthCapabilities>,
  [{ osAuthEnabled: boolean; allowLoginWithRememberMe: boolean }]
>();

describe('useAuthCapabilities', () => {
  let getAuthCapabilitiesSpy: jest.SpyInstance;

  const mockCapabilities: AuthCapabilities = {
    isBiometricsAvailable: true,
    passcodeAvailable: true,
    authLabel: 'Face ID',
    authDescription: '',
    osAuthEnabled: true,
    allowLoginWithRememberMe: false,
    authType: AUTHENTICATION_TYPE.BIOMETRIC,
    deviceAuthRequiresSettings: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOsAuthEnabled = true;
    mockAllowLoginWithRememberMe = false;
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
    expect(getAuthCapabilitiesSpy).toHaveBeenCalledWith({
      osAuthEnabled: mockOsAuthEnabled,
      allowLoginWithRememberMe: mockAllowLoginWithRememberMe,
    });
  });

  it('calls getAuthCapabilities again when osAuthEnabled or allowLoginWithRememberMe change', async () => {
    const { waitForNextUpdate, rerender } = renderHook(() =>
      useAuthCapabilities(),
    );

    await act(async () => {
      await waitForNextUpdate();
    });
    expect(getAuthCapabilitiesSpy).toHaveBeenCalledTimes(1);

    mockOsAuthEnabled = false;
    rerender();

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(getAuthCapabilitiesSpy).toHaveBeenCalledTimes(2);
    expect(getAuthCapabilitiesSpy).toHaveBeenLastCalledWith({
      osAuthEnabled: false,
      allowLoginWithRememberMe: mockAllowLoginWithRememberMe,
    });
  });
});
