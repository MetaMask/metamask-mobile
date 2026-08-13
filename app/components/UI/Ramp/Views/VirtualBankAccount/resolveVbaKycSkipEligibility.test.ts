import { HttpError } from '@metamask/controller-utils';
import Engine from '../../../../../core/Engine';
import { getSessionProfileId } from '../../../../../util/notifications/utils/get-session-profile-id';
import {
  formatVbaKycNotVerifiedMessage,
  resolveVbaKycSkipEligibility,
} from './resolveVbaKycSkipEligibility';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: { refreshKycStatus: jest.fn() },
    NeoBankService: { getCustomerByExternalId: jest.fn() },
  },
}));

jest.mock('../../../../../util/notifications/utils/get-session-profile-id');

jest.mock('../../debug/vbaTrace', () => ({
  describeError: (error: unknown) =>
    error instanceof Error
      ? { message: error.message }
      : { message: String(error) },
  vbaTrace: jest.fn(),
}));

const mockKycController = Engine.context.KycController as unknown as {
  refreshKycStatus: jest.Mock;
};

const mockNeoBankService = Engine.context.NeoBankService as unknown as {
  getCustomerByExternalId: jest.Mock;
};

describe('resolveVbaKycSkipEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getSessionProfileId).mockResolvedValue('profile-1');
    mockKycController.refreshKycStatus.mockResolvedValue({
      status: 'not-started',
      sumsubSessionId: null,
      errorCode: null,
    });
    mockNeoBankService.getCustomerByExternalId.mockResolvedValue({
      id: 'cus_1',
      status: 'Pending',
    });
  });

  it('skips when UKYC status is completed', async () => {
    mockKycController.refreshKycStatus.mockResolvedValue({
      status: 'completed',
      sumsubSessionId: null,
      errorCode: null,
    });

    await expect(resolveVbaKycSkipEligibility()).resolves.toEqual({
      skip: true,
      reason: 'ukyc-completed',
      ukycStatus: 'completed',
      customerId: 'cus_1',
      customerStatus: 'Pending',
      externalId: 'profile-1',
    });
  });

  it('skips when neobank customer status is Active and UKYC is not completed', async () => {
    mockNeoBankService.getCustomerByExternalId.mockResolvedValue({
      id: 'cus_1',
      status: 'Active',
    });

    await expect(resolveVbaKycSkipEligibility()).resolves.toEqual({
      skip: true,
      reason: 'neobank-active',
      ukycStatus: 'not-started',
      customerId: 'cus_1',
      customerStatus: 'Active',
      externalId: 'profile-1',
    });
  });

  it('does not skip when neither UKYC completed nor neobank Active', async () => {
    await expect(resolveVbaKycSkipEligibility()).resolves.toEqual({
      skip: false,
      reason: null,
      ukycStatus: 'not-started',
      customerId: 'cus_1',
      customerStatus: 'Pending',
      externalId: 'profile-1',
    });
  });

  it('treats a missing neobank customer (404) as not eligible on that path', async () => {
    mockNeoBankService.getCustomerByExternalId.mockRejectedValue(
      new HttpError(404, 'not found'),
    );

    await expect(resolveVbaKycSkipEligibility()).resolves.toEqual({
      skip: false,
      reason: null,
      ukycStatus: 'not-started',
      customerId: null,
      customerStatus: null,
      externalId: 'profile-1',
    });
  });

  it('fails open (no skip) when the neobank lookup errors unexpectedly', async () => {
    mockNeoBankService.getCustomerByExternalId.mockRejectedValue(
      new Error('network down'),
    );

    await expect(resolveVbaKycSkipEligibility()).resolves.toEqual({
      skip: false,
      reason: null,
      ukycStatus: 'not-started',
      customerId: null,
      customerStatus: null,
      externalId: 'profile-1',
    });
  });

  it('fails open when there is no session profile id', async () => {
    jest.mocked(getSessionProfileId).mockResolvedValue(undefined);

    await expect(resolveVbaKycSkipEligibility()).resolves.toEqual({
      skip: false,
      reason: null,
      ukycStatus: 'not-started',
      customerId: null,
      customerStatus: null,
      externalId: null,
    });
    expect(mockNeoBankService.getCustomerByExternalId).not.toHaveBeenCalled();
  });

  it('still skips on UKYC completed when neobank lookup fails', async () => {
    mockKycController.refreshKycStatus.mockResolvedValue({
      status: 'completed',
      sumsubSessionId: null,
      errorCode: null,
    });
    mockNeoBankService.getCustomerByExternalId.mockRejectedValue(
      new Error('network down'),
    );

    await expect(resolveVbaKycSkipEligibility()).resolves.toEqual({
      skip: true,
      reason: 'ukyc-completed',
      ukycStatus: 'completed',
      customerId: null,
      customerStatus: null,
      externalId: 'profile-1',
    });
  });

  it('still checks neobank when UKYC refresh fails', async () => {
    mockKycController.refreshKycStatus.mockRejectedValue(
      new Error('ukyc unavailable'),
    );
    mockNeoBankService.getCustomerByExternalId.mockResolvedValue({
      id: 'cus_1',
      status: 'Active',
    });

    await expect(resolveVbaKycSkipEligibility()).resolves.toEqual({
      skip: true,
      reason: 'neobank-active',
      ukycStatus: null,
      customerId: 'cus_1',
      customerStatus: 'Active',
      externalId: 'profile-1',
    });
  });

  it('prefers ukyc-completed when both checks would qualify', async () => {
    mockKycController.refreshKycStatus.mockResolvedValue({
      status: 'completed',
      sumsubSessionId: null,
      errorCode: null,
    });
    mockNeoBankService.getCustomerByExternalId.mockResolvedValue({
      id: 'cus_1',
      status: 'Active',
    });

    await expect(resolveVbaKycSkipEligibility()).resolves.toMatchObject({
      skip: true,
      reason: 'ukyc-completed',
    });
  });
});

describe('formatVbaKycNotVerifiedMessage', () => {
  it('mentions both UKYC and neobank checks', () => {
    const message = formatVbaKycNotVerifiedMessage({
      ukycStatus: 'not-started',
      customerStatus: 'Pending',
    });
    expect(message).toContain('UKYC status "not-started"');
    expect(message).toContain('neobank customer status "Pending"');
    expect(message).toContain('Active');
  });
});
