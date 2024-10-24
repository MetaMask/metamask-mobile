// Import necessary libraries and modules
import { signIn } from '.';
import Engine from '../../../core/Engine';

jest.mock('../../../core/Engine', () => ({
  resetState: jest.fn(),
  context: {
    AuthenticationController: {
      performSignIn: jest.fn(),
      getSessionProfile: jest.fn(),
    },
  },
}));

describe('signIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs in successfully and obtain profile', async () => {
    (Engine.context.AuthenticationController.performSignIn as jest.Mock).mockResolvedValue('valid-access-token');
    (Engine.context.AuthenticationController.getSessionProfile as jest.Mock).mockResolvedValue('valid-profile');

    const result = await signIn();

    expect(Engine.context.AuthenticationController.performSignIn).toHaveBeenCalled();
    expect(Engine.context.AuthenticationController.getSessionProfile).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
