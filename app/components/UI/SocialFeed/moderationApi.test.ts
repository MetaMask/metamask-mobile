import Engine from '../../../core/Engine';
import {
  blockComment,
  blockProfile,
  fetchBlockedCommentIds,
  fetchBlockedProfileIds,
  fetchModerationStatus,
} from './moderationApi';

jest.mock('../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

const mockCall = Engine.controllerMessenger.call as jest.Mock;

const blockedProfile = (profileId: string) => ({
  blockedAt: 1,
  reason: null,
  profile: { profileId, address: '0x1', name: profileId },
});

const blockedContent = (id: string, type: 'comment' | 'reply') => ({
  blockedAt: 1,
  reason: null,
  type,
  id,
  text: 'gm',
  createdAt: 1,
  author: null,
});

describe('moderationApi', () => {
  beforeEach(() => {
    mockCall.mockReset();
  });

  it('reads the viewer’s moderation status', async () => {
    const status = { banned: true, bannedAt: 1, reason: 'Spam' };
    mockCall.mockResolvedValue(status);

    await expect(fetchModerationStatus()).resolves.toBe(status);
    expect(mockCall).toHaveBeenCalledWith(
      'SocialService:fetchModerationStatus',
    );
  });

  it('reads every page of blocked traders', async () => {
    mockCall
      .mockResolvedValueOnce({
        items: [blockedProfile('a'), blockedProfile('b')],
        cursor: '1700000000000',
      })
      .mockResolvedValueOnce({ items: [blockedProfile('c')], cursor: null });

    await expect(fetchBlockedProfileIds()).resolves.toEqual(['a', 'b', 'c']);

    expect(mockCall).toHaveBeenNthCalledWith(
      1,
      'SocialService:fetchBlockedProfiles',
      undefined,
    );
    expect(mockCall).toHaveBeenNthCalledWith(
      2,
      'SocialService:fetchBlockedProfiles',
      { cursor: '1700000000000' },
    );
  });

  it('stops paging after 20 pages', async () => {
    mockCall.mockResolvedValue({ items: [], cursor: 'again' });

    await fetchBlockedProfileIds();

    expect(mockCall).toHaveBeenCalledTimes(20);
  });

  it('keeps only blocked comments, not replies', async () => {
    mockCall.mockResolvedValueOnce({
      items: [
        blockedContent('comment-1', 'comment'),
        blockedContent('reply-1', 'reply'),
      ],
      cursor: null,
    });

    await expect(fetchBlockedCommentIds()).resolves.toEqual(['comment-1']);
    expect(mockCall).toHaveBeenCalledWith(
      'SocialService:fetchBlockedContent',
      undefined,
    );
  });

  it('blocks a trader', async () => {
    mockCall.mockResolvedValue(undefined);

    await blockProfile('trader-1');

    expect(mockCall).toHaveBeenCalledWith('SocialService:block', {
      profileId: 'trader-1',
    });
  });

  it('reports a comment with a reason, and hides one without', async () => {
    mockCall.mockResolvedValue(undefined);

    await blockComment('comment-1', 'spam');
    await blockComment('comment-2');

    expect(mockCall).toHaveBeenNthCalledWith(1, 'SocialService:block', {
      commentId: 'comment-1',
      reason: 'spam',
    });
    expect(mockCall).toHaveBeenNthCalledWith(2, 'SocialService:block', {
      commentId: 'comment-2',
    });
  });
});
