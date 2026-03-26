import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import { useBrazeIdentity } from './useBrazeIdentity';
import { setBrazeUser } from './index';
import backgroundState from '../../util/test/initial-background-state.json';

jest.mock('./index', () => ({
  ...jest.requireActual('./index'),
  setBrazeUser: jest.fn(),
}));

const mockSetBrazeUser = jest.mocked(setBrazeUser);

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
  });

  it('calls setBrazeUser on mount when already signed in', () => {
    renderHookWithProvider(() => useBrazeIdentity(), {
      state: createState(true),
    });

    expect(mockSetBrazeUser).toHaveBeenCalledTimes(1);
  });

  it('does not call setBrazeUser on mount when not signed in', () => {
    renderHookWithProvider(() => useBrazeIdentity(), {
      state: createState(false),
    });

    expect(mockSetBrazeUser).not.toHaveBeenCalled();
  });
});
