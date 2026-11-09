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
