import { act, renderHook } from '@testing-library/react-native';
import { reportSocialServiceFailure } from '../../../../util/social/socialServiceTelemetry';
import { SocialAppealHttpError, submitSocialAppeal } from '../socialAppealApi';
import {
  useSubmitSocialAppeal,
  type SocialAppeal,
} from './useSubmitSocialAppeal';

jest.mock('../socialAppealApi', () => ({
  ...jest.requireActual('../socialAppealApi'),
  submitSocialAppeal: jest.fn(),
}));
jest.mock('../../../../util/social/socialServiceTelemetry', () => ({
  reportSocialServiceFailure: jest.fn(),
}));

const mockSubmit = submitSocialAppeal as jest.Mock;
const mockReport = reportSocialServiceFailure as jest.Mock;

const APPEAL: SocialAppeal = {
  email: 'alex@example.com',
  message: 'I think this is wrong.',
  decision: 'post-removed',
  handle: 'alphawhale',
  reason: 'Promises guaranteed returns',
};

const setup = () => {
  const onSent = jest.fn();
  const onFailed = jest.fn();
  const hook = renderHook(() => useSubmitSocialAppeal({ onSent, onFailed }));
  return {
    ...hook,
    submit: (appeal: SocialAppeal) => hook.result.current.submitAppeal(appeal),
    onSent,
    onFailed,
  };
};

describe('useSubmitSocialAppeal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmit.mockResolvedValue({ ticketId: '1' });
  });

  it('sends the email and a description with the message and the decision', async () => {
    const { submit, onSent, onFailed } = setup();

    await act(async () => submit(APPEAL));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const [request] = mockSubmit.mock.calls[0];
    expect(request.email).toBe('alex@example.com');
    expect(request.description).toBe(
      'I think this is wrong.\n\n---\nDecision: post-removed\nHandle: alphawhale\nReason: Promises guaranteed returns',
    );
    expect(onSent).toHaveBeenCalledTimes(1);
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('keeps the description inside the API limit by trimming the message', async () => {
    const { submit } = setup();

    await act(async () => submit({ ...APPEAL, message: 'a'.repeat(6000) }));

    const [request] = mockSubmit.mock.calls[0];
    expect(request.description).toHaveLength(5000);
    expect(request.description.endsWith(APPEAL.reason)).toBe(true);
  });

  it('reports the failure and calls onFailed when the API refuses', async () => {
    const error = new SocialAppealHttpError(429);
    mockSubmit.mockRejectedValue(error);
    const { submit, onSent, onFailed } = setup();

    await act(async () => submit(APPEAL));

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onSent).not.toHaveBeenCalled();
    expect(mockReport).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ endpoint: 'appeal', surface: 'moderation' }),
    );
  });

  it('ignores a second submit while one is in flight', async () => {
    let resolve: (value: { ticketId: string }) => void = () => undefined;
    mockSubmit.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { submit, onSent } = setup();

    await act(async () => {
      submit(APPEAL);
      submit(APPEAL);
    });
    await act(async () => resolve({ ticketId: '1' }));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it('reports isSubmitting from the request until its answer', async () => {
    let resolve: (value: { ticketId: string }) => void = () => undefined;
    mockSubmit.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { submit, result } = setup();
    expect(result.current.isSubmitting).toBe(false);

    await act(async () => submit(APPEAL));
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => resolve({ ticketId: '1' }));
    expect(result.current.isSubmitting).toBe(false);
  });

  it('accepts a new submit once the previous one failed', async () => {
    mockSubmit.mockRejectedValueOnce(new SocialAppealHttpError(502));
    const { submit, onSent } = setup();

    await act(async () => submit(APPEAL));
    await act(async () => submit(APPEAL));

    expect(mockSubmit).toHaveBeenCalledTimes(2);
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it('drops the result when the screen unmounts before the answer', async () => {
    let resolve: (value: { ticketId: string }) => void = () => undefined;
    mockSubmit.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { submit, unmount, onSent, onFailed } = setup();

    await act(async () => submit(APPEAL));
    unmount();
    await act(async () => resolve({ ticketId: '1' }));

    expect(onSent).not.toHaveBeenCalled();
    expect(onFailed).not.toHaveBeenCalled();
  });
});
