import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';
import { SocialAppealHttpError, submitSocialAppeal } from './socialAppealApi';

jest.mock('../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

const mockCall = Engine.controllerMessenger.call as jest.Mock;
const mockFetch = jest.fn();
const HOST = AppConstants.SOCIAL_API_URL.replace(/\/$/, '');

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const REQUEST = { email: 'alex@example.com', description: 'I appeal.' };

describe('submitSocialAppeal', () => {
  beforeEach(() => {
    mockCall.mockReset();
    mockCall.mockResolvedValue('test-token');
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it('posts the appeal with the bearer token and returns the ticket id', async () => {
    mockFetch.mockResolvedValue(jsonResponse(201, { ticketId: '7' }));
    const controller = new AbortController();

    await expect(
      submitSocialAppeal(REQUEST, controller.signal),
    ).resolves.toEqual({ ticketId: '7' });

    expect(mockCall).toHaveBeenCalledWith(
      'AuthenticationController:getBearerToken',
    );
    expect(mockFetch).toHaveBeenCalledWith(`${HOST}/api/v1/appeal`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(REQUEST),
      signal: controller.signal,
    });
  });

  it.each([400, 401, 429, 502, 504])(
    'throws the status on a %s response',
    async (status) => {
      mockFetch.mockResolvedValue(
        jsonResponse(status, { errorMessage: 'nope' }),
      );

      await expect(submitSocialAppeal(REQUEST)).rejects.toEqual(
        new SocialAppealHttpError(status),
      );
    },
  );

  it('rejects a response without a ticket id', async () => {
    mockFetch.mockResolvedValue(jsonResponse(201, {}));

    await expect(submitSocialAppeal(REQUEST)).rejects.toThrow('no ticketId');
  });

  it('does not call the API when there is no session', async () => {
    mockCall.mockRejectedValue(new Error('auth token expired'));

    await expect(submitSocialAppeal(REQUEST)).rejects.toThrow('auth');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
