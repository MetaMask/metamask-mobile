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
      if (key === CURRENT_APP_VERSION) return Promise.resolve('7.57.0');
      if (key === LAST_APP_VERSION) return Promise.resolve('7.56.0'); // Previous version = update
      return Promise.resolve(null);
    });

    const initialState = {
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
      if (key === CURRENT_APP_VERSION) return Promise.resolve('7.57.0');
      if (key === LAST_APP_VERSION) return Promise.resolve('7.56.0');
      return Promise.resolve(null);
    });

    const initialState = {
      user: {
        multichainAccountsIntroModalSeen: true, // Already seen
      },
    };

    renderHookWithProviders(initialState);

    // Wait for the async operation to complete
    await new Promise(setImmediate);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('returns correct state values', () => {
    const initialState = {
      user: {
        multichainAccountsIntroModalSeen: false,
      },
    };

    const { result } = renderHookWithProviders(initialState);

    expect(result.current.hasSeenIntroModal).toBe(false);
  });

  describe('isMultichainAccountsUpdate version logic', () => {
    const createInitialState = () => ({
      user: {
        multichainAccountsIntroModalSeen: false,
      },
    });

    it.each([
      ['7.56.0', '7.57.0'], // exact boundary
      ['7.55.0', '7.57.0'], // below boundary
      ['6.0.0', '7.57.0'], // major version jump
      ['7.56.0', '7.58.0'], // crossing boundary
      ['6.99.0', '8.0.0'], // major version crossing
      ['7', '7.57.0'], // missing minor version
      ['7.56.0-beta', '7.57.0'], // malformed version
    ])(
      'navigates when updating from %s to %s',
      async (lastVersion, currentVersion) => {
        mockStorageWrapper.getItem.mockImplementation((key: string) => {
          if (key === CURRENT_APP_VERSION)
            return Promise.resolve(currentVersion);
          if (key === LAST_APP_VERSION) return Promise.resolve(lastVersion);
          return Promise.resolve(null);
        });

        renderHookWithProviders(createInitialState());

        await new Promise(setImmediate);

        expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
          screen: 'MultichainAccountsIntroModal',
        });
      },
    );

    it.each([
      ['7.57.0', '7.58.0'], // already past boundary
      ['7.58.0', '7.59.0'], // both past boundary
      ['8.0.0', '8.1.0'], // major version past
      ['7.60.0', '8.0.0'], // both past boundary
      ['7.56.0', '6.0.0'], // downgrade
      ['', '7.57.0'], // empty version
    ])(
      'does not navigate when updating from %s to %s',
      async (lastVersion, currentVersion) => {
        mockStorageWrapper.getItem.mockImplementation((key: string) => {
          if (key === CURRENT_APP_VERSION)
            return Promise.resolve(currentVersion);
          if (key === LAST_APP_VERSION) return Promise.resolve(lastVersion);
          return Promise.resolve(null);
        });

        renderHookWithProviders(createInitialState());

        await new Promise(setImmediate);

        expect(mockNavigate).not.toHaveBeenCalled();
      },
    );
  });
});
