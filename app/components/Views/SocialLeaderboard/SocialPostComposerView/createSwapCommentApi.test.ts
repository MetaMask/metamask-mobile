import { createSwapComment } from './createSwapCommentApi';

const mockCall = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
    },
  },
}));

describe('createSwapComment', () => {
  beforeEach(() => {
    mockCall.mockReset();
  });

  it('calls SocialService:createSwapComment on the engine messenger', async () => {
    mockCall.mockResolvedValue({
      uid: 'comment-1',
      commentText: 'this is alpha',
      timestamp: 1700000000,
    });

    const result = await createSwapComment({
      commentText: 'this is alpha',
      positionUid: 'eth-spot',
    });

    expect(mockCall).toHaveBeenCalledWith('SocialService:createSwapComment', {
      commentText: 'this is alpha',
      positionUid: 'eth-spot',
    });
    expect(result).toStrictEqual({
      uid: 'comment-1',
      commentText: 'this is alpha',
      timestamp: 1700000000,
    });
  });
});
