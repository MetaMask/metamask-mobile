import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { VBA_KYC_VENDOR } from './constants';
import { isGeoCountryMismatch, startVbaKycSession } from './vbaKycSession';

const GEO_MISMATCH = new Error(
  'KycController already initialized with a different geoCountry',
);

const mockKycState: { email: string | null } = { email: null };
const mockMessengerCall = jest.fn();

const partnerTokenWithEmail = (email = 'user@example.com'): string => {
  const payload = Buffer.from(
    JSON.stringify({ ext: { email, email_verified: true } }),
  ).toString('base64url');
  return `header.${payload}.signature`;
};

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: {
      get state() {
        return mockKycState;
      },
      startSession: jest.fn(),
      reset: jest.fn(),
    },
  },
  controllerMessenger: {
    call: (...args: unknown[]) => mockMessengerCall(...args),
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const mockController = Engine.context.KycController as unknown as {
  startSession: jest.Mock<Promise<unknown>, [unknown]>;
  reset: jest.Mock<Promise<unknown>, []>;
};

const resumeParams = { vendor: VBA_KYC_VENDOR };
const aal2Params = { vendor: VBA_KYC_VENDOR, aal2Token: 'aal2-token' };

describe('isGeoCountryMismatch', () => {
  it('matches the geoCountry mismatch error', () => {
    expect(isGeoCountryMismatch(GEO_MISMATCH)).toBe(true);
  });

  it('matches a plain object with that message', () => {
    expect(
      isGeoCountryMismatch({
        message:
          'KycController already initialized with a different geoCountry',
      }),
    ).toBe(true);
  });

  it('does not match email or vendor mismatches', () => {
    expect(
      isGeoCountryMismatch(
        new Error('KycController already initialized with a different email'),
      ),
    ).toBe(false);
    expect(
      isGeoCountryMismatch(
        new Error('KycController already initialized with a different vendor'),
      ),
    ).toBe(false);
  });

  it('does not match non-error values', () => {
    expect(isGeoCountryMismatch(null)).toBe(false);
    expect(isGeoCountryMismatch('different geoCountry')).toBe(false);
  });
});

describe('startVbaKycSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycState.email = null;
    mockController.startSession.mockResolvedValue({ id: 'session-1' });
    mockController.reset.mockResolvedValue(undefined);
    mockMessengerCall.mockResolvedValue(partnerTokenWithEmail());
  });

  it('starts the session without resetting when there is no mismatch', async () => {
    await startVbaKycSession(resumeParams);

    expect(mockController.startSession).toHaveBeenCalledTimes(1);
    expect(mockController.startSession).toHaveBeenCalledWith(resumeParams);
    expect(mockController.reset).not.toHaveBeenCalled();
  });

  it('resets and starts again once on a geoCountry mismatch', async () => {
    mockController.startSession
      .mockRejectedValueOnce(GEO_MISMATCH)
      .mockResolvedValueOnce({ id: 'session-1' });

    await startVbaKycSession(aal2Params);

    expect(mockController.reset).toHaveBeenCalledTimes(1);
    expect(mockController.startSession).toHaveBeenCalledTimes(2);
    expect(mockController.startSession).toHaveBeenLastCalledWith(aal2Params);
    expect(mockController.reset.mock.invocationCallOrder[0]).toBeLessThan(
      mockController.startSession.mock.invocationCallOrder[1],
    );
    expect(Logger.log).toHaveBeenCalled();
  });

  it('rethrows the retry error without resetting again', async () => {
    const retryError = new Error('Session creation failed.');
    mockController.startSession
      .mockRejectedValueOnce(GEO_MISMATCH)
      .mockRejectedValueOnce(retryError);

    await expect(startVbaKycSession(resumeParams)).rejects.toBe(retryError);
    expect(mockController.reset).toHaveBeenCalledTimes(1);
    expect(mockController.startSession).toHaveBeenCalledTimes(2);
  });

  it('does not reset when the stored email is the only copy', async () => {
    mockKycState.email = 'user@example.com';
    mockMessengerCall.mockRejectedValue({ status: 422 });
    mockController.startSession.mockRejectedValueOnce(GEO_MISMATCH);

    await expect(startVbaKycSession(resumeParams)).rejects.toBe(GEO_MISMATCH);
    expect(mockController.reset).not.toHaveBeenCalled();
    expect(mockController.startSession).toHaveBeenCalledTimes(1);
    expect(mockMessengerCall).toHaveBeenCalledWith(
      'AuthenticationController:getPartnerIdentityToken',
      ['email'],
      VBA_KYC_VENDOR,
    );
  });

  it('resets when a stored email can be minted again', async () => {
    mockKycState.email = 'user@example.com';
    mockController.startSession
      .mockRejectedValueOnce(GEO_MISMATCH)
      .mockResolvedValueOnce({ id: 'session-1' });

    await startVbaKycSession(resumeParams);

    expect(mockController.reset).toHaveBeenCalledTimes(1);
    expect(mockController.startSession).toHaveBeenCalledTimes(2);
  });

  it('does not reset when the partner token has no verified email', async () => {
    mockKycState.email = 'user@example.com';
    const payload = Buffer.from(
      JSON.stringify({
        ext: { email: 'user@example.com', email_verified: false },
      }),
    ).toString('base64url');
    mockMessengerCall.mockResolvedValue(`header.${payload}.signature`);
    mockController.startSession.mockRejectedValueOnce(GEO_MISMATCH);

    await expect(startVbaKycSession(resumeParams)).rejects.toBe(GEO_MISMATCH);
    expect(mockController.reset).not.toHaveBeenCalled();
  });

  it('does not reset when confirming the partner email fails', async () => {
    mockKycState.email = 'user@example.com';
    mockMessengerCall.mockRejectedValue(new Error('network down'));
    mockController.startSession.mockRejectedValueOnce(GEO_MISMATCH);

    await expect(startVbaKycSession(resumeParams)).rejects.toBe(GEO_MISMATCH);
    expect(mockController.reset).not.toHaveBeenCalled();
  });

  it('does not reset for other errors', async () => {
    const otherError = new Error('network down');
    mockController.startSession.mockRejectedValueOnce(otherError);

    await expect(startVbaKycSession(resumeParams)).rejects.toBe(otherError);
    expect(mockController.reset).not.toHaveBeenCalled();
    expect(mockController.startSession).toHaveBeenCalledTimes(1);
  });

  it('shares one reset and one retry between overlapping calls of the same shape', async () => {
    mockController.startSession
      .mockRejectedValueOnce(GEO_MISMATCH)
      .mockResolvedValueOnce({ id: 'session-1' });

    await Promise.all([
      startVbaKycSession(resumeParams),
      startVbaKycSession(resumeParams),
    ]);

    expect(mockController.reset).toHaveBeenCalledTimes(1);
    expect(mockController.startSession).toHaveBeenCalledTimes(2);
  });

  it('does not share overlapping calls that carry different AAL2 tokens', async () => {
    const resolvers: ((value: unknown) => void)[] = [];
    mockController.startSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const first = startVbaKycSession({
      vendor: VBA_KYC_VENDOR,
      aal2Token: 'token-a',
    });
    const second = startVbaKycSession({
      vendor: VBA_KYC_VENDOR,
      aal2Token: 'token-b',
    });

    expect(mockController.startSession).toHaveBeenCalledTimes(2);
    resolvers[0]?.({ id: 'session-1' });
    resolvers[1]?.({ id: 'session-1' });
    await Promise.all([first, second]);
    expect(mockController.reset).not.toHaveBeenCalled();
  });

  it('does not share a call with an AAL2 token and a call without one', async () => {
    mockController.startSession.mockResolvedValue({ id: 'session-1' });

    await Promise.all([
      startVbaKycSession(resumeParams),
      startVbaKycSession(aal2Params),
    ]);

    expect(mockController.startSession).toHaveBeenCalledTimes(2);
    expect(mockController.reset).not.toHaveBeenCalled();
  });

  it('resets again for a mismatch that happens after an earlier attempt finished', async () => {
    mockController.startSession
      .mockRejectedValueOnce(GEO_MISMATCH)
      .mockResolvedValueOnce({ id: 'session-1' })
      .mockRejectedValueOnce(GEO_MISMATCH)
      .mockResolvedValueOnce({ id: 'session-1' });

    await startVbaKycSession(resumeParams);
    await startVbaKycSession(resumeParams);

    expect(mockController.reset).toHaveBeenCalledTimes(2);
  });
});
