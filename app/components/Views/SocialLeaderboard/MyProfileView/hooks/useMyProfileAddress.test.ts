import { renderHook } from '@testing-library/react-native';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { useSessionProfileId } from '../../../../../util/notifications/hooks/useSessionProfileId';
import { useMyProfileAddress } from './useMyProfileAddress';
import type { MySocialProfile } from './useMyProfile';

const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock(
  '../../../../../util/notifications/hooks/useSessionProfileId',
  () => ({
    useSessionProfileId: jest.fn(),
  }),
);

const mockUseSessionProfileId = jest.mocked(useSessionProfileId);

const profile = (
  overrides: Partial<MySocialProfile> = {},
): MySocialProfile => ({
  profileId: 'current-user',
  displayName: 'Giga Whale',
  handle: 'giga-whale',
  shareUrl: 'https://metamask.io/social/giga-whale',
  linkedAccountAddress: '0xlinked',
  ...overrides,
});

describe('useMyProfileAddress', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return '0xselected';
      }
      return undefined;
    });
  });

  it('returns undefined while the session profile is loading', () => {
    mockUseSessionProfileId.mockReturnValue({
      profileId: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => useMyProfileAddress(profile()));

    expect(result.current).toBeUndefined();
  });

  it('returns the session profileId once loaded', () => {
    mockUseSessionProfileId.mockReturnValue({
      profileId: 'session-profile-id',
      isLoading: false,
    });

    const { result } = renderHook(() => useMyProfileAddress(profile()));

    expect(result.current).toBe('session-profile-id');
  });

  it('falls back to the linked wallet when the session profile is missing', () => {
    mockUseSessionProfileId.mockReturnValue({
      profileId: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useMyProfileAddress(profile()));

    expect(result.current).toBe('0xlinked');
  });
});
