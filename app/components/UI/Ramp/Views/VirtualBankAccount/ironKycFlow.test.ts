import Engine from '../../../../../core/Engine';
import {
  DEMO_IDOS_DISCLAIMERS_ACCEPTED,
  DEMO_PROVIDER_DISCLAIMERS_ACCEPTED,
} from './constants';
import { startIronKycFlow, startIronKycVerification } from './ironKycFlow';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: {
      state: { error: null, vendorDisclaimers: [] },
      initialize: jest.fn(),
      createVendorCustomer: jest.fn(),
      acceptTermsAndStartSession: jest.fn(),
    },
  },
}));

const mockKycController = Engine.context.KycController as unknown as {
  state: { error: string | null; vendorDisclaimers: { id: string }[] };
  initialize: jest.Mock<Promise<void>, [unknown?]>;
  createVendorCustomer: jest.Mock<Promise<void>, [unknown?]>;
  acceptTermsAndStartSession: jest.Mock<Promise<void>, [unknown?]>;
};

const resetControllerState = ({
  error = null,
  vendorDisclaimers = [{ id: 'disclaimer-1' }],
}: {
  error?: string | null;
  vendorDisclaimers?: { id: string }[];
} = {}) => {
  mockKycController.state.error = error;
  mockKycController.state.vendorDisclaimers = vendorDisclaimers;
};

describe('startIronKycFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycController.initialize.mockResolvedValue(undefined);
    mockKycController.createVendorCustomer.mockResolvedValue(undefined);
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
    mockKycController.createVendorCustomer.mockResolvedValue(undefined);
    mockKycController.acceptTermsAndStartSession.mockResolvedValue(undefined);
    resetControllerState();
  });

  it('creates the Iron customer then accepts terms to start the session', async () => {
    await startIronKycVerification('user@example.com');

    expect(mockKycController.createVendorCustomer).toHaveBeenCalledWith({
      vendor: 'iron',
      email: 'user@example.com',
    });
    expect(mockKycController.acceptTermsAndStartSession).toHaveBeenCalledWith({
      email: 'user@example.com',
      product: 'money',
      providerDisclaimersAccepted: DEMO_PROVIDER_DISCLAIMERS_ACCEPTED,
      idosDisclaimersAccepted: DEMO_IDOS_DISCLAIMERS_ACCEPTED,
    });
  });

  it('throws the error the controller recorded while creating the customer', async () => {
    mockKycController.createVendorCustomer.mockImplementation(async () => {
      mockKycController.state.error = 'Iron customer creation failed.';
    });

    await expect(startIronKycVerification('user@example.com')).rejects.toThrow(
      'Iron customer creation failed.',
    );
    expect(mockKycController.acceptTermsAndStartSession).not.toHaveBeenCalled();
  });

  it('throws without starting a session when no disclaimers are loaded', async () => {
    resetControllerState({ vendorDisclaimers: [] });

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
