import { performSignIn, performSignOut } from '.';
import Engine from '../../core/Engine';

jest.mock('../../core/Engine', () => ({
  resetState: jest.fn(),
  context: {
    AuthenticationController: {
      performSignIn: jest.fn(),
      performSignOut: jest.fn(),
      getSessionProfile: jest.fn(),
    },
  },
}));

describe('Identity actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs in successfully and obtain profile', async () => {
    (
      Engine.context.AuthenticationController.performSignIn as jest.Mock
    ).mockResolvedValue('valid-access-token');
    (
      Engine.context.AuthenticationController.getSessionProfile as jest.Mock
    ).mockResolvedValue('valid-profile');

    const result = await performSignIn();

    expect(
      Engine.context.AuthenticationController.performSignIn,
    ).toHaveBeenCalled();
    expect(
      Engine.context.AuthenticationController.getSessionProfile,
    ).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('signs out successfully', async () => {
    (
      Engine.context.AuthenticationController.performSignOut as jest.Mock
    ).mockResolvedValue(undefined);

    const result = await performSignOut();

    expect(
      Engine.context.AuthenticationController.performSignOut,
    ).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
