import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useBrazeIdentity } from './useBrazeIdentity';
import {
  setBrazeUser,
  clearBrazeUser,
  refreshBrazeBanners,
} from '../../../../core/Braze';
import { backgroundState } from '../../../test/initial-root-state';

jest.mock('../../../../core/Braze', () => ({
  ...jest.requireActual('../../../../core/Braze'),
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

  it('calls refreshBrazeBanners immediately on sign-in without waiting for setBrazeUser', () => {
    renderHookWithProvider(() => useBrazeIdentity(), {
      state: createState(true),
    });

    expect(mockRefreshBrazeBanners).toHaveBeenCalledTimes(1);
  });

  it('does not call refreshBrazeBanners when not signed in', () => {
    renderHookWithProvider(() => useBrazeIdentity(), {
      state: createState(false),
    });

    expect(mockRefreshBrazeBanners).not.toHaveBeenCalled();
  });
});
