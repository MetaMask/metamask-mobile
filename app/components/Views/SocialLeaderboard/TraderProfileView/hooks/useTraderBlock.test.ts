import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type { BlockedProfilesResponse } from '@metamask/social-controllers';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { BLOCKED_PROFILES_QUERY_KEY, useTraderBlock } from './useTraderBlock';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../selectors/keyringController', () => ({
  selectIsUnlocked: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('@metamask/react-data-query');

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

const PROFILE_ID = '11111111-1111-1111-1111-111111111111';

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockCall = Engine.controllerMessenger.call as jest.Mock;
const mockRefetch = jest.fn();

const blockedResponse = (profileIds: string[]): BlockedProfilesResponse => ({
  items: profileIds.map((profileId) => ({
    blockedAt: 1_710_000_000,
    reason: null,
    profile: {
      profileId,
      address: '0xabc',
      allAddresses: ['0xabc'],
      name: 'trader',
      imageUrl: null,
    },
  })),
  cursor: null,
});

const mockQueryData = (data: BlockedProfilesResponse | undefined) => {
  mockUseQuery.mockReturnValue({
    data,
    error: null,
    refetch: mockRefetch,
  } as unknown as ReturnType<typeof useQuery>);
};

describe('useTraderBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
    mockRefetch.mockResolvedValue(undefined);
    mockCall.mockResolvedValue(undefined);
    mockQueryData(blockedResponse([]));
  });

  it('queries the blocked profiles list when unlocked with a profile id', () => {
    renderHook(() => useTraderBlock(PROFILE_ID));

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: BLOCKED_PROFILES_QUERY_KEY,
      enabled: true,
    });
  });

  it('disables the query until the profile id is known', () => {
    renderHook(() => useTraderBlock(undefined));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('disables the query while the wallet is locked', () => {
    mockUseSelector.mockReturnValue(false);

    renderHook(() => useTraderBlock(PROFILE_ID));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('reports blocked when the profile is in the blocked list', () => {
    mockQueryData(blockedResponse([PROFILE_ID]));

    const { result } = renderHook(() => useTraderBlock(PROFILE_ID));

    expect(result.current.isBlocked).toBe(true);
  });

  it('reports not blocked when the profile is absent or data is loading', () => {
    mockQueryData(undefined);

    const { result } = renderHook(() => useTraderBlock(PROFILE_ID));

    expect(result.current.isBlocked).toBe(false);
  });

  it('blocks via SocialService, flips optimistically, and refetches', async () => {
    const { result } = renderHook(() => useTraderBlock(PROFILE_ID));

    let didBlock = false;
    await act(async () => {
      didBlock = await result.current.block();
    });

    expect(didBlock).toBe(true);
    expect(mockCall).toHaveBeenCalledWith('SocialService:block', {
      profileId: PROFILE_ID,
    });
    expect(result.current.isBlocked).toBe(true);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('unblocks via SocialService:unblockProfile and flips optimistically', async () => {
    mockQueryData(blockedResponse([PROFILE_ID]));
    const { result } = renderHook(() => useTraderBlock(PROFILE_ID));

    let didUnblock = false;
    await act(async () => {
      didUnblock = await result.current.unblock();
    });

    expect(didUnblock).toBe(true);
    expect(mockCall).toHaveBeenCalledWith('SocialService:unblockProfile', {
      profileId: PROFILE_ID,
    });
    expect(result.current.isBlocked).toBe(false);
  });

  it('rolls back and logs when the block request fails', async () => {
    mockCall.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useTraderBlock(PROFILE_ID));

    let didBlock = true;
    await act(async () => {
      didBlock = await result.current.block();
    });

    expect(didBlock).toBe(false);
    expect(result.current.isBlocked).toBe(false);
    expect(mockRefetch).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalled();
  });

  it('does nothing without a profile id', async () => {
    const { result } = renderHook(() => useTraderBlock(undefined));

    let didBlock = true;
    await act(async () => {
      didBlock = await result.current.block();
    });

    expect(didBlock).toBe(false);
    expect(mockCall).not.toHaveBeenCalled();
  });
});
