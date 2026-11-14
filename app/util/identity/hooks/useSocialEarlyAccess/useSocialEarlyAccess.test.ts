import { renderHook, waitFor } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  clearSocialEarlyAccess,
  selectSocialEarlyAccessProfileId,
  setSocialEarlyAccess,
} from '../../../../core/redux/slices/socialEarlyAccess';
import { selectIsSocialV1Treatment } from '../../../../selectors/featureFlagController/socialV1';
import {
  selectCanonicalProfileId,
  selectIsSignedIn,
  selectSessionProfileId,
} from '../../../../selectors/identity';
import { useSocialEarlyAccess } from './useSocialEarlyAccess';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));
jest.mock('../../../../core/Engine', () => ({
  context: {
    ProfileService: {
      checkEarlyAccess: jest.fn(),
    },
  },
}));

interface SelectorValues {
  isSignedIn: boolean;
  canonicalProfileId: string | undefined;
  sessionProfileId: string | undefined;
  isSocialV1Treatment: boolean;
  storedProfileId: string | null;
}

const DEFAULT_SELECTORS: SelectorValues = {
  isSignedIn: true,
  canonicalProfileId: 'canonical-1',
  sessionProfileId: 'session-1',
  isSocialV1Treatment: false,
  storedProfileId: null,
};

let selectorValues: SelectorValues = DEFAULT_SELECTORS;

const mockSelectors = (overrides: Partial<SelectorValues> = {}) => {
  selectorValues = { ...DEFAULT_SELECTORS, ...overrides };
};

const mockDispatch = jest.fn();
const mockCheckEarlyAccess = jest.mocked(
  Engine.context.ProfileService.checkEarlyAccess,
);

const flushPromises = () => new Promise(process.nextTick);

describe('useSocialEarlyAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectors();
    jest.mocked(useDispatch).mockReturnValue(mockDispatch);
    jest.mocked(useSelector).mockImplementation((selector) => {
      switch (selector) {
        case selectIsSignedIn:
          return selectorValues.isSignedIn;
        case selectCanonicalProfileId:
          return selectorValues.canonicalProfileId;
        case selectSessionProfileId:
          return selectorValues.sessionProfileId;
        case selectIsSocialV1Treatment:
          return selectorValues.isSocialV1Treatment;
        case selectSocialEarlyAccessProfileId:
          return selectorValues.storedProfileId;
        default:
          return undefined;
      }
    });
    mockCheckEarlyAccess.mockResolvedValue({ hasAccess: true });
  });

  it('stores the early-access answer for the canonical profile', async () => {
    renderHook(() => useSocialEarlyAccess());

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        setSocialEarlyAccess({ profileId: 'canonical-1', hasAccess: true }),
      );
    });
  });

  it('falls back to the session profile id when there is no canonical id', async () => {
    mockSelectors({ canonicalProfileId: undefined });

    renderHook(() => useSocialEarlyAccess());

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        setSocialEarlyAccess({ profileId: 'session-1', hasAccess: true }),
      );
    });
  });

  it.each([
    ['signed out', { isSignedIn: false }],
    [
      'no profile id is known',
      { canonicalProfileId: undefined, sessionProfileId: undefined },
    ],
    [
      'the user is in the Social V1 treatment bucket',
      { isSocialV1Treatment: true },
    ],
  ])('does not fetch when %s', async (_label, overrides) => {
    mockSelectors(overrides);

    renderHook(() => useSocialEarlyAccess());

    await flushPromises();
    expect(mockCheckEarlyAccess).not.toHaveBeenCalled();
  });

  it('fetches once per profile across re-renders', async () => {
    const { rerender } = renderHook(() => useSocialEarlyAccess());
    await flushPromises();

    rerender({});
    await flushPromises();

    expect(mockCheckEarlyAccess).toHaveBeenCalledTimes(1);
  });

  it('fetches again for a different profile', async () => {
    const { rerender } = renderHook(() => useSocialEarlyAccess());
    await flushPromises();

    mockSelectors({ canonicalProfileId: 'canonical-2' });
    rerender({});

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        setSocialEarlyAccess({ profileId: 'canonical-2', hasAccess: true }),
      );
    });
    expect(mockCheckEarlyAccess).toHaveBeenCalledTimes(2);
  });

  it('keeps the stored value when the request fails', async () => {
    mockCheckEarlyAccess.mockRejectedValue(new Error('network'));

    renderHook(() => useSocialEarlyAccess());

    await waitFor(() => {
      expect(mockCheckEarlyAccess).toHaveBeenCalledTimes(1);
    });
    await flushPromises();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('clears the stored answer on sign-out', async () => {
    const { rerender } = renderHook(() => useSocialEarlyAccess());
    await flushPromises();

    mockSelectors({ isSignedIn: false });
    rerender({});

    expect(mockDispatch).toHaveBeenCalledWith(clearSocialEarlyAccess());
  });

  it('clears the stored answer when the profile changes', async () => {
    mockSelectors({ storedProfileId: 'canonical-0' });

    renderHook(() => useSocialEarlyAccess());

    await flushPromises();
    expect(mockDispatch).toHaveBeenCalledWith(clearSocialEarlyAccess());
  });

  it.each([
    ['the profile matches', { storedProfileId: 'canonical-1' }],
    [
      'no profile id is known yet',
      {
        storedProfileId: 'canonical-0',
        canonicalProfileId: undefined,
        sessionProfileId: undefined,
      },
    ],
  ])('keeps the stored answer when %s', async (_label, overrides) => {
    mockSelectors(overrides);

    renderHook(() => useSocialEarlyAccess());

    await flushPromises();
    expect(mockDispatch).not.toHaveBeenCalledWith(clearSocialEarlyAccess());
  });

  it('does not clear the stored answer when the app starts signed out', async () => {
    mockSelectors({ isSignedIn: false });

    renderHook(() => useSocialEarlyAccess());

    await flushPromises();
    expect(mockDispatch).not.toHaveBeenCalledWith(clearSocialEarlyAccess());
  });
});
