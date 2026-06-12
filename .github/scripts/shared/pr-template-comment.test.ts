import { renderFailureComment, upsertStickyComment } from './pr-template-comment';
import { Labelable, LabelableType } from './labelable';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STICKY_MARKER = '<!-- pr-template-checks -->';

const makeLabelable = (overrides: Partial<Labelable> = {}): Labelable => ({
  id: 'PR_1',
  type: LabelableType.PullRequest,
  number: 42,
  repoOwner: 'MetaMask',
  repoName: 'metamask-mobile',
  createdAt: '2024-01-01T00:00:00Z',
  body: '',
  author: 'dev',
  labels: [],
  ...overrides,
});

/** Build a minimal octokit mock. `comments` is the list returned by the paginator. */
function makeOctokit(
  comments: { id: number; body: string }[] = [],
  apiOverrides: Record<string, jest.Mock> = {},
) {
  const listComments = jest.fn().mockResolvedValue({ data: comments });
  const deleteComment = jest.fn().mockResolvedValue({});
  const createComment = jest.fn().mockResolvedValue({});
  const updateComment = jest.fn().mockResolvedValue({});

  return {
    paginate: {
      iterator: jest.fn((_fn: unknown, _params: unknown) => ({
        // Async iterator that yields one page of results
        [Symbol.asyncIterator]: async function* () {
          yield { data: comments };
        },
      })),
    },
    rest: {
      issues: {
        listComments,
        deleteComment: apiOverrides.deleteComment ?? deleteComment,
        createComment: apiOverrides.createComment ?? createComment,
        updateComment: apiOverrides.updateComment ?? updateComment,
      },
    },
  };
}

// ─── renderFailureComment ─────────────────────────────────────────────────────

describe('renderFailureComment', () => {
  it('contains the static heading', () => {
    const result = renderFailureComment(['Reason A'], false);
    expect(result).toContain('PR template — items to address before');
  });

  it('lists each reason as a bullet', () => {
    const result = renderFailureComment(['First reason', 'Second reason'], false);
    expect(result).toContain('- First reason');
    expect(result).toContain('- Second reason');
  });

  it('contains the ready-for-review doc link', () => {
    const result = renderFailureComment(['x'], false);
    expect(result).toContain('ready-for-review.md');
  });

  it('shows the blocking message when isDraft is false', () => {
    const result = renderFailureComment(['x'], false);
    expect(result).toContain('blocking');
    expect(result).not.toContain('informational');
  });

  it('shows the informational message when isDraft is true', () => {
    const result = renderFailureComment(['x'], true);
    expect(result).toContain('informational');
    // The draft note mentions "blocking" only in the future-tense clause
    // ("will start blocking once…"), not as the primary description.
    expect(result).not.toMatch(/^_This check is blocking\./m);
  });

  it('does not prepend the sticky marker (that is done by upsertStickyComment)', () => {
    const result = renderFailureComment(['x'], false);
    expect(result).not.toContain('<!-- pr-template-checks -->');
  });
});

// ─── upsertStickyComment ──────────────────────────────────────────────────────

describe('upsertStickyComment', () => {
  const labelable = makeLabelable();

  describe('when body is null (all checks pass)', () => {
    it('deletes the existing sticky comment when one is found', async () => {
      const existingComment = { id: 99, body: `${STICKY_MARKER}\nold content` };
      const deleteComment = jest.fn().mockResolvedValue({});
      const octokit = makeOctokit([existingComment], { deleteComment });

      await upsertStickyComment(octokit as never, labelable, null);

      expect(deleteComment).toHaveBeenCalledWith(
        expect.objectContaining({ comment_id: 99 }),
      );
    });

    it('does nothing when no sticky comment exists', async () => {
      const deleteComment = jest.fn();
      const octokit = makeOctokit([], { deleteComment });

      await upsertStickyComment(octokit as never, labelable, null);

      expect(deleteComment).not.toHaveBeenCalled();
    });
  });

  describe('when body is provided', () => {
    it('creates a new comment when none exists', async () => {
      const createComment = jest.fn().mockResolvedValue({});
      const octokit = makeOctokit([], { createComment });

      await upsertStickyComment(octokit as never, labelable, 'new content');

      expect(createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: labelable.number,
          body: expect.stringContaining('new content'),
        }),
      );
    });

    it('prepends the sticky marker to the created comment body', async () => {
      const createComment = jest.fn().mockResolvedValue({});
      const octokit = makeOctokit([], { createComment });

      await upsertStickyComment(octokit as never, labelable, 'content here');

      const [{ body }] = createComment.mock.calls[0] as [{ body: string }][];
      expect(body.startsWith(STICKY_MARKER)).toBe(true);
    });

    it('updates the existing comment when content has changed', async () => {
      const existingComment = { id: 7, body: `${STICKY_MARKER}\nold content` };
      const updateComment = jest.fn().mockResolvedValue({});
      const octokit = makeOctokit([existingComment], { updateComment });

      await upsertStickyComment(octokit as never, labelable, 'new content');

      expect(updateComment).toHaveBeenCalledWith(
        expect.objectContaining({
          comment_id: 7,
          body: expect.stringContaining('new content'),
        }),
      );
    });

    it('skips the update when the existing comment is already up to date', async () => {
      const body = 'unchanged content';
      const existingComment = { id: 5, body: `${STICKY_MARKER}\n${body}` };
      const updateComment = jest.fn();
      const createComment = jest.fn();
      const octokit = makeOctokit([existingComment], { updateComment, createComment });

      await upsertStickyComment(octokit as never, labelable, body);

      expect(updateComment).not.toHaveBeenCalled();
      expect(createComment).not.toHaveBeenCalled();
    });
  });

  describe('error resilience', () => {
    it('does not throw when the octokit API call fails', async () => {
      const createComment = jest.fn().mockRejectedValue(new Error('network error'));
      const octokit = makeOctokit([], { createComment });

      await expect(
        upsertStickyComment(octokit as never, labelable, 'content'),
      ).resolves.not.toThrow();
    });
  });
});
