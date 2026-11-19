import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { VBA_KYC_VENDOR } from './constants';
import { isGeoCountryMismatch, startVbaKycSession } from './vbaKycSession';

const GEO_MISMATCH = new Error(
  'KycController already initialized with a different geoCountry',
);

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: {
      startSession: jest.fn(),
      reset: jest.fn(),
      readSessionStatus: jest.fn(),
    },
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
  readSessionStatus: jest.Mock<unknown, []>;
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
    mockController.startSession.mockResolvedValue({ id: 'session-1' });
    mockController.reset.mockResolvedValue(undefined);
    mockController.readSessionStatus.mockReturnValue(null);
  });

  it('starts the session without resetting when there is no mismatch', async () => {
    await startVbaKycSession(resumeParams);

    expect(mockController.startSession).toHaveBeenCalledTimes(1);
    expect(mockController.startSession).toHaveBeenCalledWith(resumeParams);
    expect(mockController.reset).not.toHaveBeenCalled();
  });

  it('keeps a stored session on a geoCountry mismatch', async () => {
    mockController.readSessionStatus.mockReturnValue({ id: 'session-1' });
    mockController.startSession.mockRejectedValueOnce(GEO_MISMATCH);

    await expect(startVbaKycSession(resumeParams)).resolves.toBeUndefined();

    expect(mockController.reset).not.toHaveBeenCalled();
    expect(mockController.startSession).toHaveBeenCalledTimes(1);
    expect(Logger.log).toHaveBeenCalled();
  });

  it.each(['expired', 'new'])(
    'resets a stored session whose capability authorization is %s',
    async (capabilityAuthorizationStatus) => {
      mockController.readSessionStatus.mockReturnValue({
        id: 'session-1',
        finalStatus: 'pending',
        capabilityAuthorizationStatus,
      });
      mockController.startSession
        .mockRejectedValueOnce(GEO_MISMATCH)
        .mockResolvedValueOnce({ id: 'session-1' });

      await startVbaKycSession(resumeParams);

      expect(mockController.reset).toHaveBeenCalledTimes(1);
      expect(mockController.startSession).toHaveBeenCalledTimes(2);
    },
  );

  it('keeps an approved session even when its authorization expired', async () => {
    mockController.readSessionStatus.mockReturnValue({
      id: 'session-1',
      finalStatus: 'approved',
      capabilityAuthorizationStatus: 'expired',
    });
    mockController.startSession.mockRejectedValueOnce(GEO_MISMATCH);

    await startVbaKycSession(resumeParams);

    expect(mockController.reset).not.toHaveBeenCalled();
    expect(mockController.startSession).toHaveBeenCalledTimes(1);
  });

  it('resets and starts again once when no session is stored', async () => {
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

  it.each([
    new Error('KycController already initialized with a different email'),
    new Error('KycController already initialized with a different vendor'),
    new Error('network down'),
  ])('rethrows %s without resetting', async (otherError) => {
    mockController.readSessionStatus.mockReturnValue({ id: 'session-1' });
    mockController.startSession.mockRejectedValueOnce(otherError);

    await expect(startVbaKycSession(resumeParams)).rejects.toBe(otherError);
    expect(mockController.reset).not.toHaveBeenCalled();
    expect(mockController.startSession).toHaveBeenCalledTimes(1);
  });
});
