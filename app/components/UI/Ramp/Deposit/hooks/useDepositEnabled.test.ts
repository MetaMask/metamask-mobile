import initialRootState, {
  backgroundState,
} from '../../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useDepositEnabled from './useDepositEnabled';
import { getVersion } from 'react-native-device-info';

function mockInitialState({
  depositActiveFlag = true,
  depositMinimumVersionFlag = '1.0.0',
}: {
  depositActiveFlag?: boolean;
  depositMinimumVersionFlag?: string | null | undefined;
}) {
  return {
    ...initialRootState,
    engine: {
      backgroundState: {
        ...backgroundState,
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            depositConfig: {
              active: depositActiveFlag,
              minimumVersion: depositMinimumVersionFlag,
            },
          },
        },
      },
    },
  };
}

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

describe('useDepositEnabled', () => {
  const mockGetVersion = jest.mocked(getVersion);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when deposit is enabled and version meets the minimum requirement', () => {
    mockGetVersion.mockReturnValue('2.0.0');

    const { result } = renderHookWithProvider(() => useDepositEnabled(), {
      state: mockInitialState({
        depositActiveFlag: true,
        depositMinimumVersionFlag: '1.5.0',
      }),
    });

    expect(result.current.isDepositEnabled).toBe(true);
  });

  it('returns false when deposit is disabled', () => {
    mockGetVersion.mockReturnValue('2.0.0');

    const { result } = renderHookWithProvider(() => useDepositEnabled(), {
      state: mockInitialState({
        depositActiveFlag: false,
        depositMinimumVersionFlag: '1.5.0',
      }),
    });

    expect(result.current.isDepositEnabled).toBe(false);
  });

  it('returns false when version does not meet the minimum requirement', () => {
    mockGetVersion.mockReturnValue('1.0.0');

    const { result } = renderHookWithProvider(() => useDepositEnabled(), {
      state: mockInitialState({
        depositActiveFlag: true,
        depositMinimumVersionFlag: '1.5.0',
      }),
    });

    expect(result.current.isDepositEnabled).toBe(false);
  });

  it('returns false when minimum version is not defined', () => {
    mockGetVersion.mockReturnValue('2.0.0');

    const { result } = renderHookWithProvider(() => useDepositEnabled(), {
      state: mockInitialState({
        depositActiveFlag: true,
        depositMinimumVersionFlag: null,
      }),
    });

    expect(result.current.isDepositEnabled).toBe(false);
  });
});
