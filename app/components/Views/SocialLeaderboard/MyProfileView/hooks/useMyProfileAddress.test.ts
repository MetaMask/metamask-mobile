import { renderHook } from '@testing-library/react-native';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { useSocialProfileId } from '../../../../../util/social/useSocialProfileId';
import { useMyProfileAddress } from './useMyProfileAddress';
import type { MySocialProfile } from './useMyProfile';

const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../../../util/social/useSocialProfileId', () => ({
  useSocialProfileId: jest.fn(),
}));

const mockUseSocialProfileId = jest.mocked(useSocialProfileId);

const profile = (
  overrides: Partial<MySocialProfile> = {},
): MySocialProfile => ({
  profileId: 'current-user',
  displayName: 'Giga Whale',
  handle: 'giga-whale',
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
    mockUseSocialProfileId.mockReturnValue({
      profileId: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => useMyProfileAddress(profile()));

    expect(result.current).toBeUndefined();
  });

  it('returns the session profileId once loaded', () => {
    mockUseSocialProfileId.mockReturnValue({
      profileId: 'session-profile-id',
      isLoading: false,
    });

    const { result } = renderHook(() => useMyProfileAddress(profile()));

    expect(result.current).toBe('session-profile-id');
  });

  it('falls back to the linked wallet when the session profile is missing', () => {
    mockUseSocialProfileId.mockReturnValue({
      profileId: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useMyProfileAddress(profile()));

    expect(result.current).toBe('0xlinked');
  });
});
