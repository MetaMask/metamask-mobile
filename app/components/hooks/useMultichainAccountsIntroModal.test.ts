import { useMultichainAccountsIntroModal } from './useMultichainAccountsIntroModal';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import StorageWrapper from '../../store/storage-wrapper';
import { CURRENT_APP_VERSION, LAST_APP_VERSION } from '../../constants/storage';

// Mock the navigation
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock StorageWrapper
jest.mock('../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
}));

const mockStorageWrapper = StorageWrapper as jest.Mocked<typeof StorageWrapper>;

const renderHookWithProviders = (initialState = {}) =>
  renderHookWithProvider(() => useMultichainAccountsIntroModal(), {
    state: initialState,
  });

describe('useMultichainAccountsIntroModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not navigate on fresh install when feature is enabled', async () => {
    // Mock fresh install (no last app version)
    mockStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === CURRENT_APP_VERSION) return Promise.resolve('1.0.0');
      if (key === LAST_APP_VERSION) return Promise.resolve(null); // No previous version = fresh install
      return Promise.resolve(null);
    });

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

    // Wait for the async operation to complete
    await new Promise(setImmediate);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates on app update when feature is enabled and not seen', async () => {
    // Mock app update (has last app version different from current)
    mockStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === CURRENT_APP_VERSION) return Promise.resolve('1.1.0');
      if (key === LAST_APP_VERSION) return Promise.resolve('1.0.0'); // Previous version = update
      return Promise.resolve(null);
    });

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

    // Wait for the async operation to complete
    await new Promise(setImmediate);

    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'MultichainAccountsIntroModal',
    });
  });

  it('does not navigate when modal has already been seen', async () => {
    // Mock app update
    mockStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === CURRENT_APP_VERSION) return Promise.resolve('1.1.0');
      if (key === LAST_APP_VERSION) return Promise.resolve('1.0.0');
      return Promise.resolve(null);
    });

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
        multichainAccountsIntroModalSeen: true, // Already seen
      },
    };

    renderHookWithProviders(initialState);

    // Wait for the async operation to complete
    await new Promise(setImmediate);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when feature is disabled', async () => {
    // Mock app update
    mockStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === CURRENT_APP_VERSION) return Promise.resolve('1.1.0');
      if (key === LAST_APP_VERSION) return Promise.resolve('1.0.0');
      return Promise.resolve(null);
    });

    const initialState = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: false, // Feature disabled
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

    // Wait for the async operation to complete
    await new Promise(setImmediate);

    expect(mockNavigate).not.toHaveBeenCalled();
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
});
