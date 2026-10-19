import Engine from '../../../../core/Engine';
import {
  prefetchSumsubToken,
  takePrefetchedSumsubToken,
} from './sumsubTokenPrefetch';

const mockKycState: {
  sessionStatus?: { id: string } | null;
} = { sessionStatus: null };

const mockCreateJourney = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    KycController: {
      get state() {
        return mockKycState;
      },
    },
    KycService: {
      createJourney: (...args: unknown[]) => mockCreateJourney(...args),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

describe('sumsubTokenPrefetch', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockKycState.sessionStatus = null;
    // Drain any prefetch cached by a previous test.
    await takePrefetchedSumsubToken();
  });

  it('prefetches an applicant token for the current session', async () => {
    mockKycState.sessionStatus = { id: 'session-1' };
    mockCreateJourney.mockResolvedValue({ applicantAccessToken: 'token-1' });

    prefetchSumsubToken();

    await expect(takePrefetchedSumsubToken()).resolves.toBe('token-1');
    expect(mockCreateJourney).toHaveBeenCalledWith('session-1');
  });

  it('does not prefetch without a session', async () => {
    mockKycState.sessionStatus = null;

    prefetchSumsubToken();

    await expect(takePrefetchedSumsubToken()).resolves.toBeUndefined();
    expect(mockCreateJourney).not.toHaveBeenCalled();
  });

  it('prefetches only once until the token is taken', async () => {
    mockKycState.sessionStatus = { id: 'session-1' };
    mockCreateJourney.mockResolvedValue({ applicantAccessToken: 'token-1' });

    prefetchSumsubToken();
    prefetchSumsubToken();

    await expect(takePrefetchedSumsubToken()).resolves.toBe('token-1');
    expect(mockCreateJourney).toHaveBeenCalledTimes(1);

    prefetchSumsubToken();
    expect(mockCreateJourney).toHaveBeenCalledTimes(2);
  });

  it('resolves a token created after the take', async () => {
    mockKycState.sessionStatus = { id: 'session-1' };
    let resolveJourney:
      | ((journey: { applicantAccessToken: string }) => void)
      | undefined;
    mockCreateJourney.mockReturnValue(
      new Promise((resolve) => {
        resolveJourney = resolve;
      }),
    );

    prefetchSumsubToken();
    const taken = takePrefetchedSumsubToken();
    resolveJourney?.({ applicantAccessToken: 'late-token' });

    await expect(taken).resolves.toBe('late-token');
  });

  it('resolves undefined when the prefetch fails', async () => {
    mockKycState.sessionStatus = { id: 'session-1' };
    mockCreateJourney.mockRejectedValue(new Error('journey failed'));

    prefetchSumsubToken();

    await expect(takePrefetchedSumsubToken()).resolves.toBeUndefined();
  });

  it('resolves undefined when nothing was prefetched', async () => {
    await expect(takePrefetchedSumsubToken()).resolves.toBeUndefined();
  });
});
