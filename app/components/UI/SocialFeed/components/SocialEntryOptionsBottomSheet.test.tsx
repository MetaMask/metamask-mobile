import React from 'react';
import { Pressable, View } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialEntryOptionsBottomSheet, {
  SocialEntryReportReason,
  SocialEntryOptionsProvider,
  useSocialEntryOptions,
} from './SocialEntryOptionsBottomSheet';
import {
  getSocialEntryReportReasonTestId,
  SocialEntryOptionsBottomSheetSelectorsIDs,
} from './SocialEntryOptionsBottomSheet.testIds';
import { useSocialModerationActions } from '../hooks/useSocialModerationActions';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockBlockComment = jest.fn();
const mockBlockProfile = jest.fn();
const mockInvalidateBlockLists = jest.fn();
jest.mock('../moderationApi', () => ({
  blockComment: (...args: unknown[]) => mockBlockComment(...args),
  blockProfile: (...args: unknown[]) => mockBlockProfile(...args),
  invalidateBlockLists: () => mockInvalidateBlockLists(),
}));

let mockBlockLists = {
  blockedProfileIds: new Set<string>(),
  blockedCommentIds: new Set<string>(),
};
jest.mock('../hooks/useSocialBlockLists', () => ({
  useSocialBlockLists: () => mockBlockLists,
}));

const mockEnsureSocialProfileOnboarding = jest.fn();
jest.mock(
  '../../../Views/SocialLeaderboard/hooks/useRequireSocialProfileOnboarding',
  () => ({
    useRequireSocialProfileOnboarding: () => ({
      ensureSocialProfileOnboarding: mockEnsureSocialProfileOnboarding,
    }),
  }),
);

const mockOpenSocialSupport = jest.fn();
jest.mock('../hooks/useOpenSocialSupport', () => ({
  useOpenSocialSupport: () => mockOpenSocialSupport,
}));

const mockReportSocialServiceFailure = jest.fn();
jest.mock('../../../../util/social/socialServiceTelemetry', () => ({
  reportSocialServiceFailure: (...args: unknown[]) =>
    mockReportSocialServiceFailure(...args),
}));

interface MockSocialProfileIdResult {
  profileId: string | undefined;
  isLoading: boolean;
}

const mockUseSocialProfileId = jest.fn<MockSocialProfileIdResult, []>(() => ({
  profileId: 'viewer-1',
  isLoading: false,
}));
jest.mock('../../../../util/social/useSocialProfileId', () => ({
  useSocialProfileId: () => mockUseSocialProfileId(),
}));

interface EntryProps {
  postId: string;
  authorId?: string;
  commentId?: string;
}

/** A feed row: renders nothing once hidden, like the real rows. */
const Entry = ({ postId, authorId = 'author-1', commentId }: EntryProps) => {
  const { open, sheet, isHidden } = useSocialEntryOptions({
    postId,
    authorId,
    authorHandle: 'alice',
    commentId,
  });
  if (isHidden) {
    return null;
  }
  return (
    <>
      <Pressable testID={`trigger-${postId}`} onPress={open} />
      <View testID={`post-${postId}`} />
      {sheet}
    </>
  );
};

const OwnAuthorBlockAction = () => {
  const { blockUser } = useSocialModerationActions();
  return (
    <Pressable
      testID="own-author-block-trigger"
      onPress={() =>
        blockUser(
          {
            postId: 'own-post',
            authorId: 'viewer-1',
            authorHandle: 'viewer',
          },
          {
            apply: jest.fn(),
            revert: jest.fn(),
          },
        )
      }
    />
  );
};

const openOptionsFor = (postId: string) =>
  fireEvent.press(screen.getByTestId(`trigger-${postId}`));

const pressOption = (testID: string) =>
  fireEvent.press(screen.getByTestId(testID));

const submitReport = (reason: SocialEntryReportReason) => {
  pressOption(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT);
  pressOption(getSocialEntryReportReasonTestId(reason));
  pressOption(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_SUBMIT);
};

describe('SocialEntryOptionsBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSocialProfileId.mockReturnValue({
      profileId: 'viewer-1',
      isLoading: false,
    });
    mockBlockComment.mockResolvedValue(undefined);
    mockBlockProfile.mockResolvedValue(undefined);
    mockInvalidateBlockLists.mockResolvedValue(undefined);
    mockEnsureSocialProfileOnboarding.mockReturnValue(true);
    mockBlockLists = {
      blockedProfileIds: new Set(),
      blockedCommentIds: new Set(),
    };
  });

  it('renders nothing while closed', () => {
    const { toJSON } = renderWithProvider(
      <SocialEntryOptionsBottomSheet isOpen={false} onClose={jest.fn()} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders all moderation actions when open', () => {
    renderWithProvider(
      <SocialEntryOptionsBottomSheet isOpen onClose={jest.fn()} />,
    );

    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER),
    ).toBeOnTheScreen();
  });

  it('collects a reason before submitting a report', () => {
    const onClose = jest.fn();
    const onReport = jest.fn();

    renderWithProvider(
      <SocialEntryOptionsBottomSheet
        isOpen
        onClose={onClose}
        onReport={onReport}
      />,
    );

    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT),
    );

    expect(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_REASON_SHEET,
      ),
    ).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByTestId(
        getSocialEntryReportReasonTestId(
          SocialEntryReportReason.ScamsAndPhishing,
        ),
      ),
    );
    fireEvent.press(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_SUBMIT,
      ),
    );

    expect(onReport).toHaveBeenCalledWith(
      SocialEntryReportReason.ScamsAndPhishing,
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not submit a report until a reason is selected', () => {
    const onClose = jest.fn();
    const onReport = jest.fn();

    renderWithProvider(
      <SocialEntryOptionsBottomSheet
        isOpen
        onClose={onClose}
        onReport={onReport}
      />,
    );

    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT),
    );
    fireEvent.press(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_SUBMIT,
      ),
    );

    expect(onReport).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('opens customer support for impersonation and skips the report', () => {
    const onClose = jest.fn();
    const onReport = jest.fn();

    renderWithProvider(
      <SocialEntryOptionsBottomSheet
        isOpen
        onClose={onClose}
        onReport={onReport}
      />,
    );

    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT),
    );
    fireEvent.press(
      screen.getByTestId(
        getSocialEntryReportReasonTestId(SocialEntryReportReason.Impersonation),
      ),
    );
    fireEvent.press(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_SUBMIT,
      ),
    );

    expect(onReport).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.IMPERSONATION_SUPPORT,
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        SocialEntryOptionsBottomSheetSelectorsIDs.IMPERSONATION_SUPPORT_CONTACT,
      ),
    );

    expect(mockOpenSocialSupport).toHaveBeenCalledTimes(1);
  });

  it.each([
    [SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST, 'onHidePost'],
    [SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER, 'onBlockUser'],
  ] as const)('closes after %s is pressed', (testID, callbackName) => {
    const onClose = jest.fn();
    const callback = jest.fn();

    renderWithProvider(
      <SocialEntryOptionsBottomSheet
        isOpen
        onClose={onClose}
        {...{ [callbackName]: callback }}
      />,
    );

    fireEvent.press(screen.getByTestId(testID));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the backdrop without reporting', () => {
    const onClose = jest.fn();
    const onReport = jest.fn();

    renderWithProvider(
      <SocialEntryOptionsBottomSheet
        isOpen
        onClose={onClose}
        onReport={onReport}
      />,
    );

    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.BACKDROP),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReport).not.toHaveBeenCalled();
  });

  it('hosts a single sheet outside the trigger when a provider is mounted', () => {
    const Trigger = () => {
      const { open, sheet } = useSocialEntryOptions({
        postId: 'post-1',
        authorId: 'author-1',
        authorHandle: 'alice',
      });
      return (
        <>
          <Pressable testID="options-trigger" onPress={open} />
          {sheet}
        </>
      );
    };

    renderWithProvider(
      <SocialEntryOptionsProvider>
        <Trigger />
      </SocialEntryOptionsProvider>,
    );

    expect(
      screen.queryByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.SHEET),
    ).toBeNull();

    fireEvent.press(screen.getByTestId('options-trigger'));

    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
  });

  it('hides only the selected post', () => {
    renderWithProvider(
      <SocialEntryOptionsProvider>
        <Entry postId="one" />
        <Entry postId="two" />
      </SocialEntryOptionsProvider>,
    );

    fireEvent.press(screen.getByTestId('trigger-one'));
    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST),
    );

    expect(screen.queryByTestId('post-one')).toBeNull();
    expect(screen.getByTestId('post-two')).toBeOnTheScreen();
  });

  it('hides every post from a blocked user', () => {
    renderWithProvider(
      <SocialEntryOptionsProvider>
        <Entry postId="one" />
        <Entry postId="two" />
      </SocialEntryOptionsProvider>,
    );

    fireEvent.press(screen.getByTestId('trigger-one'));
    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER),
    );

    expect(screen.queryByTestId('post-one')).toBeNull();
    expect(screen.queryByTestId('post-two')).toBeNull();
  });

  it('shares moderation state across nested providers', () => {
    renderWithProvider(
      <SocialEntryOptionsProvider>
        <Entry postId="outer" />
        <SocialEntryOptionsProvider>
          <Entry postId="inner" />
        </SocialEntryOptionsProvider>
      </SocialEntryOptionsProvider>,
    );

    fireEvent.press(screen.getByTestId('trigger-inner'));
    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER),
    );

    expect(screen.queryByTestId('post-inner')).toBeNull();
    expect(screen.queryByTestId('post-outer')).toBeNull();
  });

  it('hides the report option for a post without a comment', () => {
    renderWithProvider(
      <SocialEntryOptionsBottomSheet
        isOpen
        onClose={jest.fn()}
        canReport={false}
      />,
    );

    expect(
      screen.queryByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT),
    ).toBeNull();
    expect(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST),
    ).toBeOnTheScreen();
  });

  describe('moderation actions', () => {
    const renderFeed = (...entries: EntryProps[]) =>
      renderWithProvider(
        <SocialEntryOptionsProvider>
          {entries.map((entry) => (
            <Entry key={entry.postId} {...entry} />
          ))}
        </SocialEntryOptionsProvider>,
      );

    it('reports the comment with the chosen reason and hides the post', async () => {
      renderFeed({ postId: 'one', commentId: 'comment-1' });

      openOptionsFor('one');
      submitReport(SocialEntryReportReason.HarassmentHateAndThreats);

      expect(screen.queryByTestId('post-one')).toBeNull();
      await waitFor(() =>
        expect(mockBlockComment).toHaveBeenCalledWith(
          'comment-1',
          'harassment_hate_and_threats',
        ),
      );
      await waitFor(() => expect(mockInvalidateBlockLists).toHaveBeenCalled());
    });

    it('keeps an impersonation report off the social API', () => {
      renderFeed({ postId: 'one', commentId: 'comment-1' });

      openOptionsFor('one');
      submitReport(SocialEntryReportReason.Impersonation);

      expect(screen.getByTestId('post-one')).toBeOnTheScreen();
      expect(mockBlockComment).not.toHaveBeenCalled();
      expect(mockBlockProfile).not.toHaveBeenCalled();
      expect(
        screen.getByTestId(
          SocialEntryOptionsBottomSheetSelectorsIDs.IMPERSONATION_SUPPORT,
        ),
      ).toBeOnTheScreen();
    });

    it('offers no report for a post without a comment', () => {
      renderFeed({ postId: 'one' });

      openOptionsFor('one');

      expect(
        screen.queryByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT),
      ).toBeNull();
    });

    it('hides block and report for the viewer own post', () => {
      renderFeed({
        postId: 'own',
        authorId: 'viewer-1',
        commentId: 'comment-1',
      });

      openOptionsFor('own');

      expect(
        screen.queryByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT),
      ).toBeNull();
      expect(
        screen.queryByTestId(
          SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER,
        ),
      ).toBeNull();
      expect(
        screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST),
      ).toBeOnTheScreen();
    });

    it('hides block and report while the viewer profile is loading', () => {
      mockUseSocialProfileId.mockReturnValue({
        profileId: undefined,
        isLoading: true,
      });
      renderFeed({
        postId: 'loading',
        authorId: 'author-1',
        commentId: 'comment-1',
      });

      openOptionsFor('loading');

      expect(
        screen.queryByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.REPORT),
      ).toBeNull();
      expect(
        screen.queryByTestId(
          SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER,
        ),
      ).toBeNull();
      expect(
        screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST),
      ).toBeOnTheScreen();
    });

    it('ignores a direct block action for the viewer own post', () => {
      renderWithProvider(<OwnAuthorBlockAction />);

      fireEvent.press(screen.getByTestId('own-author-block-trigger'));

      expect(mockBlockProfile).not.toHaveBeenCalled();
    });

    it('hides a post by blocking its comment, without a reason', async () => {
      renderFeed({ postId: 'one', commentId: 'comment-1' });

      openOptionsFor('one');
      pressOption(SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST);

      expect(screen.queryByTestId('post-one')).toBeNull();
      await waitFor(() =>
        expect(mockBlockComment).toHaveBeenCalledWith('comment-1'),
      );
    });

    it('hides a post without a comment for the session only', () => {
      renderFeed({ postId: 'one' });

      openOptionsFor('one');
      pressOption(SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST);

      expect(mockBlockComment).not.toHaveBeenCalled();
      expect(screen.queryByTestId('post-one')).toBeNull();
    });

    it('blocks the author and hides all of their posts', async () => {
      renderFeed(
        { postId: 'one', authorId: 'author-1' },
        { postId: 'two', authorId: 'author-1' },
        { postId: 'three', authorId: 'author-2' },
      );

      openOptionsFor('one');
      pressOption(SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER);

      expect(screen.queryByTestId('post-one')).toBeNull();
      expect(screen.queryByTestId('post-two')).toBeNull();
      expect(screen.getByTestId('post-three')).toBeOnTheScreen();
      await waitFor(() =>
        expect(mockBlockProfile).toHaveBeenCalledWith('author-1'),
      );
    });

    it('shows the post again and reports the failure when the request fails', async () => {
      const error = new Error('HTTP 500');
      mockBlockProfile.mockRejectedValue(error);
      renderFeed({ postId: 'one' });

      openOptionsFor('one');
      pressOption(SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER);

      expect(await screen.findByTestId('post-one')).toBeOnTheScreen();
      expect(mockReportSocialServiceFailure).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          surface: 'moderation',
          operation: 'block_user',
        }),
      );
      expect(mockInvalidateBlockLists).not.toHaveBeenCalled();
    });

    it('sends the viewer to onboarding instead of acting without a profile', () => {
      mockEnsureSocialProfileOnboarding.mockReturnValue(false);
      renderFeed({ postId: 'one', commentId: 'comment-1' });

      openOptionsFor('one');
      pressOption(SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER);

      expect(mockBlockProfile).not.toHaveBeenCalled();
      expect(screen.getByTestId('post-one')).toBeOnTheScreen();
    });

    it('hides posts from blocked traders and blocked comments', () => {
      mockBlockLists = {
        blockedProfileIds: new Set(['author-2']),
        blockedCommentIds: new Set(['comment-3']),
      };

      renderFeed(
        { postId: 'one', authorId: 'author-1', commentId: 'comment-1' },
        { postId: 'two', authorId: 'author-2' },
        { postId: 'three', authorId: 'author-1', commentId: 'comment-3' },
      );

      expect(screen.getByTestId('post-one')).toBeOnTheScreen();
      expect(screen.queryByTestId('post-two')).toBeNull();
      expect(screen.queryByTestId('post-three')).toBeNull();
    });

    it('persists actions from a standalone row too', async () => {
      renderWithProvider(<Entry postId="one" commentId="comment-1" />);

      openOptionsFor('one');
      pressOption(SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST);

      expect(screen.queryByTestId('post-one')).toBeNull();
      await waitFor(() =>
        expect(mockBlockComment).toHaveBeenCalledWith('comment-1'),
      );
    });
  });
});
