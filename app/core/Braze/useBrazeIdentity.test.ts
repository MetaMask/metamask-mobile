import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import { useBrazeIdentity } from './useBrazeIdentity';
import { syncBrazeProfileId, clearBrazeProfileId } from './index';
import { backgroundState } from '../../util/test/initial-root-state';

jest.mock('./index', () => ({
  ...jest.requireActual('./index'),
  syncBrazeProfileId: jest.fn(),
  clearBrazeProfileId: jest.fn(),
}));

const mockSyncBrazeProfileId = jest.mocked(syncBrazeProfileId);
const mockClearBrazeProfileId = jest.mocked(clearBrazeProfileId);

const createState = (isSignedIn: boolean) => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      AuthenticationController: {
        isSignedIn,
      },
    },
  },
});

describe('useBrazeIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncs profile ID on mount when already signed in', () => {
    renderHookWithProvider(() => useBrazeIdentity(), {
      state: createState(true),
    });

    expect(mockSyncBrazeProfileId).toHaveBeenCalledTimes(1);
    expect(mockClearBrazeProfileId).not.toHaveBeenCalled();
  });

  it('does not sync profile ID on mount when not signed in', () => {
    renderHookWithProvider(() => useBrazeIdentity(), {
      state: createState(false),
    });

    expect(mockSyncBrazeProfileId).not.toHaveBeenCalled();
    expect(mockClearBrazeProfileId).not.toHaveBeenCalled();
  });
});
