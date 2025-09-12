import { useMultichainAccountsIntroModal } from './useMultichainAccountsIntroModal';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';

// Mock the navigation
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const renderHookWithProviders = (initialState = {}) =>
  renderHookWithProvider(() => useMultichainAccountsIntroModal(), {
    state: initialState,
  });

describe('useMultichainAccountsIntroModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('does not navigate when multichain accounts state 2 is disabled', () => {
    const initialState = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: false,
                featureVersion: '2',
                minimumVersion: '1.0.0',
              },
            },
          },
        },
      },
      user: {
        multichainAccountsIntroModalSeen: false,
      },
    };

    renderHookWithProviders(initialState);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when modal has already been seen', () => {
    const initialState = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: true,
                featureVersion: '2',
                minimumVersion: '1.0.0',
              },
            },
          },
        },
      },
      user: {
        multichainAccountsIntroModalSeen: true,
      },
    };

    renderHookWithProviders(initialState);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to intro modal when state 2 is enabled and modal not seen', () => {
    const initialState = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: true,
                featureVersion: '2',
                minimumVersion: '1.0.0',
              },
            },
          },
        },
      },
      user: {
        multichainAccountsIntroModalSeen: false,
      },
    };

    renderHookWithProviders(initialState);

    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'MultichainAccountsIntroModal',
    });
  });

  it('returns correct state values', () => {
    const initialState = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: true,
                featureVersion: '2',
                minimumVersion: '1.0.0',
              },
            },
          },
        },
      },
      user: {
        multichainAccountsIntroModalSeen: false,
      },
    };

    const { result } = renderHookWithProviders(initialState);

    expect(result.current.isMultichainAccountsState2Enabled).toBe(true);
    expect(result.current.hasSeenIntroModal).toBe(false);
  });

  it('does not navigate when both conditions are not met', () => {
    const initialState = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: false,
                featureVersion: '2',
                minimumVersion: '1.0.0',
              },
            },
          },
        },
      },
      user: {
        multichainAccountsIntroModalSeen: true,
      },
    };

    renderHookWithProviders(initialState);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
