import { waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useBrazeIdentity } from './useBrazeIdentity';
import { setBrazeUser, clearBrazeUser, refreshBrazeBanners } from '../..';
import { backgroundState } from '../../../../util/test/initial-root-state';

jest.mock('../..', () => ({
  setBrazeUser: jest.fn(),
  clearBrazeUser: jest.fn(),
  refreshBrazeBanners: jest.fn(),
}));

const mockSetBrazeUser = jest.mocked(setBrazeUser);
const mockClearBrazeUser = jest.mocked(clearBrazeUser);
const mockRefreshBrazeBanners = jest.mocked(refreshBrazeBanners);

const createState = (isSignedIn: boolean) =>
  ({
    engine: {
      backgroundState: {
        ...backgroundState,
        AuthenticationController: {
          isSignedIn,
        },
      },
    },
  }) as unknown as Record<string, unknown>;

describe('useBrazeIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetBrazeUser.mockResolvedValue(undefined);
  });

  it('calls setBrazeUser on mount when already signed in', () => {
    renderHookWithProvider(() => useBrazeIdentity(), {
      state: createState(true),
    });

    expect(mockSetBrazeUser).toHaveBeenCalledTimes(1);
    expect(mockClearBrazeUser).not.toHaveBeenCalled();
  });

  it('calls clearBrazeUser on mount when not signed in', () => {
    renderHookWithProvider(() => useBrazeIdentity(), {
      state: createState(false),
    });

    expect(mockClearBrazeUser).toHaveBeenCalledTimes(1);
    expect(mockSetBrazeUser).not.toHaveBeenCalled();
  });

  it('waits for setBrazeUser before refreshing banners on sign-in', async () => {
    let resolveSetBrazeUser: () => void = () => undefined;
    mockSetBrazeUser.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSetBrazeUser = resolve;
      }),
    );

    renderHookWithProvider(() => useBrazeIdentity(), {
      state: createState(true),
    });

    expect(mockRefreshBrazeBanners).not.toHaveBeenCalled();

    resolveSetBrazeUser();

    await waitFor(() => {
      expect(mockRefreshBrazeBanners).toHaveBeenCalledTimes(1);
    });
    expect(mockSetBrazeUser).toHaveBeenCalledTimes(1);
  });

  it('does not refresh banners if the hook unmounts before setBrazeUser resolves', async () => {
    let resolveSetBrazeUser: () => void = () => undefined;
    mockSetBrazeUser.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSetBrazeUser = resolve;
      }),
    );

    const { unmount } = renderHookWithProvider(() => useBrazeIdentity(), {
      state: createState(true),
    });

    unmount();
    resolveSetBrazeUser();

    await Promise.resolve();

    expect(mockSetBrazeUser).toHaveBeenCalledTimes(1);
    expect(mockRefreshBrazeBanners).not.toHaveBeenCalled();
  });

  it('does not call refreshBrazeBanners when not signed in', () => {
    renderHookWithProvider(() => useBrazeIdentity(), {
      state: createState(false),
    });

    expect(mockRefreshBrazeBanners).not.toHaveBeenCalled();
  });
});
