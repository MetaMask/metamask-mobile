import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import {
  BLOCKED_PROFILE_IDS_QUERY_KEY,
  fetchBlockedProfileIds,
} from '../../../../../components/UI/SocialFeed/moderationApi';
import { useTraderBlock } from './useTraderBlock';

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

jest.mock('@tanstack/react-query');

jest.mock('../../../../../components/UI/SocialFeed/moderationApi', () => ({
  BLOCKED_PROFILE_IDS_QUERY_KEY: ['social', 'moderation', 'blockedProfileIds'],
  fetchBlockedProfileIds: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

const PROFILE_ID = '11111111-1111-1111-1111-111111111111';

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockCall = Engine.controllerMessenger.call as jest.Mock;
const mockFetchBlockedProfileIds =
  fetchBlockedProfileIds as jest.MockedFunction<typeof fetchBlockedProfileIds>;
const mockRefetch = jest.fn();

const mockQueryData = (data: string[] | undefined) => {
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
    mockFetchBlockedProfileIds.mockResolvedValue([]);
    mockQueryData([]);
  });

  it('queries the blocked profiles list when unlocked with a profile id', () => {
    renderHook(() => useTraderBlock(PROFILE_ID));

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: BLOCKED_PROFILE_IDS_QUERY_KEY,
      queryFn: fetchBlockedProfileIds,
      enabled: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
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
    mockQueryData([PROFILE_ID]);

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
    mockQueryData([PROFILE_ID]);
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
