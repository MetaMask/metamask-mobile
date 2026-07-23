import { renderHook } from '@testing-library/react-hooks';
import { MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY } from '@metamask/ramps-controller';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import { useHeadlessAllProvidersEnabled } from './useHeadlessAllProvidersEnabled';

jest.mock('../../../../util/remoteFeatureFlag', () => ({
  validatedVersionGatedFeatureFlag: jest.fn(),
}));

const mockValidatedVersionGated = validatedVersionGatedFeatureFlag as jest.Mock;

let mockControllerState: unknown;

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: mockControllerState,
        },
      },
    }),
}));

describe('useHeadlessAllProvidersEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockControllerState = undefined;
  });

  it('returns true when the remote flag is the literal boolean true', () => {
    mockControllerState = {
      remoteFeatureFlags: { [MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY]: true },
    };

    const { result } = renderHook(() => useHeadlessAllProvidersEnabled());

    expect(result.current).toBe(true);
  });

  it('returns false when the flag is missing', () => {
    mockControllerState = { remoteFeatureFlags: {} };

    const { result } = renderHook(() => useHeadlessAllProvidersEnabled());

    expect(result.current).toBe(false);
  });

  it('returns false when the controller state is not initialized yet', () => {
    mockControllerState = undefined;

    const { result } = renderHook(() => useHeadlessAllProvidersEnabled());

    expect(result.current).toBe(false);
  });

  it.each([
    ['true'],
    [1],
    [{ enabled: false }],
    [{ enabled: 'true' }],
    [{ providerIds: ['/providers/moonpay'] }],
    ['all'],
  ])('returns false when the flag value is the non-enabling %p', (value) => {
    mockControllerState = {
      remoteFeatureFlags: { [MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY]: value },
    };

    const { result } = renderHook(() => useHeadlessAllProvidersEnabled());

    expect(result.current).toBe(false);
  });

  it('returns true for an object payload whose enabled is the literal true', () => {
    mockControllerState = {
      remoteFeatureFlags: {
        [MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY]: {
          enabled: true,
          featureVersion: '1',
          providerIds: ['/providers/moonpay'],
        },
      },
    };

    const { result } = renderHook(() => useHeadlessAllProvidersEnabled());

    expect(result.current).toBe(true);
  });

  it('honors a Settings localOverrides true value over a remote false value', () => {
    mockControllerState = {
      remoteFeatureFlags: { [MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY]: false },
      localOverrides: { [MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY]: true },
    };

    const { result } = renderHook(() => useHeadlessAllProvidersEnabled());

    expect(result.current).toBe(true);
  });

  it('returns false for an enabled payload without the current featureVersion', () => {
    mockControllerState = {
      remoteFeatureFlags: {
        [MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY]: { enabled: true },
      },
    };

    const { result } = renderHook(() => useHeadlessAllProvidersEnabled());

    expect(result.current).toBe(false);
  });

  it('validates a payload minimumVersion through the shared version gate', () => {
    mockValidatedVersionGated.mockReturnValue(true);
    mockControllerState = {
      remoteFeatureFlags: {
        [MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY]: {
          enabled: true,
          featureVersion: '1',
          minimumVersion: '8.6.0',
        },
      },
    };

    const { result } = renderHook(() => useHeadlessAllProvidersEnabled());

    expect(mockValidatedVersionGated).toHaveBeenCalledWith({
      enabled: true,
      minimumVersion: '8.6.0',
    });
    expect(result.current).toBe(true);
  });

  it('returns false when the shared version gate rejects the minimumVersion', () => {
    mockValidatedVersionGated.mockReturnValue(false);
    mockControllerState = {
      remoteFeatureFlags: {
        [MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY]: {
          enabled: true,
          featureVersion: '1',
          minimumVersion: '99.0.0',
        },
      },
    };

    const { result } = renderHook(() => useHeadlessAllProvidersEnabled());

    expect(result.current).toBe(false);
  });

  it('returns false when the shared version gate cannot validate (undefined)', () => {
    mockValidatedVersionGated.mockReturnValue(undefined);
    mockControllerState = {
      remoteFeatureFlags: {
        [MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY]: {
          enabled: true,
          featureVersion: '1',
          minimumVersion: 'not-a-version',
        },
      },
    };

    const { result } = renderHook(() => useHeadlessAllProvidersEnabled());

    expect(result.current).toBe(false);
  });

  it('skips the version gate for the boolean form and payloads without minimumVersion', () => {
    mockControllerState = {
      remoteFeatureFlags: { [MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY]: true },
    };

    const { result } = renderHook(() => useHeadlessAllProvidersEnabled());

    expect(mockValidatedVersionGated).not.toHaveBeenCalled();
    expect(result.current).toBe(true);
  });

  it('honors a Settings localOverrides false value over a remote true value', () => {
    mockControllerState = {
      remoteFeatureFlags: { [MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY]: true },
      localOverrides: { [MONEY_HEADLESS_ALL_PROVIDERS_FLAG_KEY]: false },
    };

    const { result } = renderHook(() => useHeadlessAllProvidersEnabled());

    expect(result.current).toBe(false);
  });
});
