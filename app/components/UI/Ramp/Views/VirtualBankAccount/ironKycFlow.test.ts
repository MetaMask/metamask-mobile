import Engine from '../../../../../core/Engine';
import { startIronKycFlow, startIronKycVerification } from './ironKycFlow';
import { resolveVbaKycSkipEligibility } from './resolveVbaKycSkipEligibility';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: {
      state: { error: null, disclaimers: [] },
      initialize: jest.fn(),
      createIronCustomer: jest.fn(),
      acceptTermsAndStartSession: jest.fn(),
    },
  },
}));

jest.mock('./resolveVbaKycSkipEligibility', () => ({
  resolveVbaKycSkipEligibility: jest.fn(),
}));

const mockKycController = Engine.context.KycController as unknown as {
  state: { error: string | null; disclaimers: { id: string }[] };
  initialize: jest.Mock<Promise<void>, [unknown?]>;
  createIronCustomer: jest.Mock<Promise<void>, [unknown?]>;
  acceptTermsAndStartSession: jest.Mock<Promise<void>, [unknown?]>;
};

const mockResolveVbaKycSkipEligibility = jest.mocked(
  resolveVbaKycSkipEligibility,
);

const resetControllerState = ({
  error = null,
  disclaimers = [{ id: 'disclaimer-1' }],
}: {
  error?: string | null;
  disclaimers?: { id: string }[];
} = {}) => {
  mockKycController.state.error = error;
  mockKycController.state.disclaimers = disclaimers;
};

const notEligible = {
  skip: false as const,
  reason: null,
  ukycStatus: 'not-started',
  customerId: null,
  customerStatus: 'Pending',
  externalId: 'profile-1',
};

describe('startIronKycFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycController.initialize.mockResolvedValue(undefined);
    mockKycController.createIronCustomer.mockResolvedValue(undefined);
    mockKycController.acceptTermsAndStartSession.mockResolvedValue(undefined);
    resetControllerState();
  });

  it('initializes the controller for the Iron money flow', async () => {
    await startIronKycFlow();

    expect(mockKycController.initialize).toHaveBeenCalledWith({
      vendor: 'iron',
      product: 'money',
    });
  });

  it('throws the error the controller recorded while initializing', async () => {
    mockKycController.initialize.mockImplementation(async () => {
      mockKycController.state.error = 'Failed to load disclaimers.';
    });

    await expect(startIronKycFlow()).rejects.toThrow(
      'Failed to load disclaimers.',
    );
  });

  it('throws when a retry rewrites the same Iron/SumSub error', async () => {
    const sameError = 'SNSMobileSDKModule missing';
    resetControllerState({ error: sameError });
    mockKycController.initialize.mockImplementation(async () => {
      mockKycController.state.error = sameError;
    });

    await expect(startIronKycFlow()).rejects.toThrow(sameError);
  });

  it('throws when a non-null controller error remains after the step', async () => {
    resetControllerState({ error: 'Stale failure from a previous attempt.' });

    await expect(startIronKycFlow()).rejects.toThrow(
      'Stale failure from a previous attempt.',
    );
  });
});

describe('startIronKycVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycController.initialize.mockResolvedValue(undefined);
    mockKycController.createIronCustomer.mockResolvedValue(undefined);
    mockKycController.acceptTermsAndStartSession.mockResolvedValue(undefined);
    mockResolveVbaKycSkipEligibility.mockResolvedValue(notEligible);
    resetControllerState();
  });

  it('skips Iron/SumSub when UKYC status is completed', async () => {
    mockResolveVbaKycSkipEligibility.mockResolvedValue({
      skip: true,
      reason: 'ukyc-completed',
      ukycStatus: 'completed',
      customerId: null,
      customerStatus: null,
      externalId: 'profile-1',
    });

    await expect(
      startIronKycVerification('user@example.com'),
    ).resolves.toBeUndefined();

    expect(mockKycController.createIronCustomer).not.toHaveBeenCalled();
    expect(mockKycController.acceptTermsAndStartSession).not.toHaveBeenCalled();
  });

  it('skips Iron/SumSub when neobank customer status is Active', async () => {
    mockResolveVbaKycSkipEligibility.mockResolvedValue({
      skip: true,
      reason: 'neobank-active',
      ukycStatus: 'not-started',
      externalId: 'profile-1',
      customerId: 'cus_1',
      customerStatus: 'Active',
    });

    await expect(
      startIronKycVerification('user@example.com'),
    ).resolves.toBeUndefined();

    expect(mockKycController.createIronCustomer).not.toHaveBeenCalled();
    expect(mockKycController.acceptTermsAndStartSession).not.toHaveBeenCalled();
  });

  it('creates the Iron customer then accepts terms when not eligible to skip', async () => {
    await startIronKycVerification('user@example.com');

    expect(mockResolveVbaKycSkipEligibility).toHaveBeenCalled();
    expect(mockKycController.createIronCustomer).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
    expect(mockKycController.acceptTermsAndStartSession).toHaveBeenCalledWith({
      email: 'user@example.com',
      product: 'money',
      sumsubTncSigned: true,
      idosTncSigned: true,
    });
  });

  it('throws the error the controller recorded while creating the customer', async () => {
    mockKycController.createIronCustomer.mockImplementation(async () => {
      mockKycController.state.error = 'Iron customer creation failed.';
    });

    await expect(startIronKycVerification('user@example.com')).rejects.toThrow(
      'Iron customer creation failed.',
    );
    expect(mockKycController.acceptTermsAndStartSession).not.toHaveBeenCalled();
  });

  it('throws without starting a session when no disclaimers are loaded', async () => {
    resetControllerState({ disclaimers: [] });

    await expect(startIronKycVerification('user@example.com')).rejects.toThrow(
      'Terms are not loaded yet.',
    );
    expect(mockKycController.acceptTermsAndStartSession).not.toHaveBeenCalled();
  });

  it('throws the error the controller recorded while starting the session', async () => {
    mockKycController.acceptTermsAndStartSession.mockImplementation(
      async () => {
        mockKycController.state.error = 'Iron session failed: consents.';
      },
    );

    await expect(startIronKycVerification('user@example.com')).rejects.toThrow(
      'Iron session failed: consents.',
    );
  });
});
