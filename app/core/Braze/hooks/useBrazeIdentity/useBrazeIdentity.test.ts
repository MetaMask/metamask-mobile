import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useBrazeIdentity } from './useBrazeIdentity';
import { setBrazeUser, clearBrazeUser, refreshBrazeBanners } from '../..';
import { backgroundState } from '../../../../util/test/initial-root-state';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../..', () => ({
  setBrazeUser: jest.fn(),
  clearBrazeUser: jest.fn(),
  refreshBrazeBanners: jest.fn(),
}));

const mockSetBrazeUser = jest.mocked(setBrazeUser);
const mockClearBrazeUser = jest.mocked(clearBrazeUser);
const mockRefreshBrazeBanners = jest.mocked(refreshBrazeBanners);
const mockUseSelector = jest.mocked(useSelector);

let mockIsSignedIn = false;

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
    mockIsSignedIn = false;
    jest.clearAllMocks();
    mockSetBrazeUser.mockResolvedValue(undefined);
    mockUseSelector.mockImplementation((selector) =>
      selector(createState(mockIsSignedIn) as never),
    );
  });

  it('calls setBrazeUser on mount when already signed in', () => {
    mockIsSignedIn = true;
    renderHook(() => useBrazeIdentity());

    expect(mockSetBrazeUser).toHaveBeenCalledTimes(1);
    expect(mockClearBrazeUser).not.toHaveBeenCalled();
  });

  it('does not clear Braze on initial mount when not signed in', () => {
    renderHook(() => useBrazeIdentity());

    expect(mockClearBrazeUser).not.toHaveBeenCalled();
    expect(mockSetBrazeUser).not.toHaveBeenCalled();
  });

  it('clears Braze after transitioning from signed in to signed out', () => {
    mockIsSignedIn = true;
    const { rerender } = renderHook(() => useBrazeIdentity());

    expect(mockSetBrazeUser).toHaveBeenCalledTimes(1);
    expect(mockClearBrazeUser).not.toHaveBeenCalled();

    mockIsSignedIn = false;
    rerender({});

    expect(mockClearBrazeUser).toHaveBeenCalledTimes(1);
  });

  it('waits for setBrazeUser before refreshing banners on sign-in', async () => {
    let resolveSetBrazeUser: () => void = () => undefined;
    mockSetBrazeUser.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSetBrazeUser = resolve;
      }),
    );

    mockIsSignedIn = true;
    renderHook(() => useBrazeIdentity());

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

    mockIsSignedIn = true;
    const { unmount } = renderHook(() => useBrazeIdentity());

    unmount();
    resolveSetBrazeUser();

    await Promise.resolve();

    expect(mockSetBrazeUser).toHaveBeenCalledTimes(1);
    expect(mockRefreshBrazeBanners).not.toHaveBeenCalled();
  });

  it('does not call refreshBrazeBanners when not signed in', () => {
    renderHook(() => useBrazeIdentity());

    expect(mockRefreshBrazeBanners).not.toHaveBeenCalled();
  });
});
