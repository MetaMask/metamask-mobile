import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import { resolveSharedSocialPosition } from '../../../../core/DeeplinkManager/handlers/legacy/socialPositionSheetDeeplink';
import { mapPositionToFeedItem } from '../SocialPostComposerView/mapPositionToFeedItem';
import type { SocialV1FeedAuthor } from '../../../UI/SocialFeed/types';
import { useSharedPositionPreview } from './useSharedPositionPreview';

jest.mock(
  '../../../../core/DeeplinkManager/handlers/legacy/socialPositionSheetDeeplink',
  () => ({ resolveSharedSocialPosition: jest.fn() }),
);

jest.mock('../SocialPostComposerView/mapPositionToFeedItem', () => ({
  mapPositionToFeedItem: jest.fn(() => ({ id: 'composer-position-1' })),
}));

const POSITION = { positionId: 'position-1' } as unknown as Position;
const AUTHOR = {
  id: 'trader-2',
  username: 'owner',
  address: '0xowner',
  avatarUri: null,
} as unknown as SocialV1FeedAuthor;

const renderPreview = (positionId: string | undefined) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSharedPositionPreview(positionId, 'trader-1'), {
    wrapper,
  });
};

describe('useSharedPositionPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads nothing for a profile link', () => {
    const { result } = renderPreview(undefined);

    expect(result.current).toEqual({
      feedItem: null,
      ownerTraderId: undefined,
      isLoading: false,
    });
    expect(resolveSharedSocialPosition).not.toHaveBeenCalled();
  });

  it('maps the shared position to a snapshot feed card under its owner', async () => {
    jest.mocked(resolveSharedSocialPosition).mockResolvedValue({
      position: POSITION,
      author: AUTHOR,
      isOwnerMismatch: true,
    });

    const { result } = renderPreview('position-1');

    expect(result.current.isLoading).toBe(true);
    await waitFor(() =>
      expect(result.current.feedItem).toEqual({ id: 'composer-position-1' }),
    );
    expect(result.current.ownerTraderId).toBe('trader-2');
    expect(resolveSharedSocialPosition).toHaveBeenCalledWith(
      'position-1',
      'trader-1',
      expect.any(String),
    );
    expect(mapPositionToFeedItem).toHaveBeenCalledWith(POSITION, '', {
      author: AUTHOR,
      liveTicks: false,
    });
  });

  it('shows no card when the position cannot be fetched', async () => {
    jest.mocked(resolveSharedSocialPosition).mockResolvedValue(undefined);

    const { result } = renderPreview('position-1');

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.feedItem).toBeNull();
    expect(result.current.ownerTraderId).toBeUndefined();
  });
});
