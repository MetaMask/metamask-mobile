import Engine from '../../../../../core/Engine';
import { startIronKycFlow, startIronKycVerification } from './ironKycFlow';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: {
      state: { error: null, vendorDisclaimers: [] },
      initialize: jest.fn(),
      createVendorCustomer: jest.fn(),
      acceptTermsAndStartSession: jest.fn(),
    },
    KycService: {
      getGeoCountry: jest.fn(),
      fetchDisclaimersCatalog: jest.fn(),
    },
  },
}));

const mockKycController = Engine.context.KycController as unknown as {
  state: {
    error: string | null;
    vendorDisclaimers: { id: string }[];
  };
  initialize: jest.Mock<Promise<void>, [unknown?]>;
  createVendorCustomer: jest.Mock<Promise<void>, [unknown?]>;
  acceptTermsAndStartSession: jest.Mock<Promise<void>, [unknown?]>;
};

const mockKycService = Engine.context.KycService as unknown as {
  getGeoCountry: jest.Mock<Promise<string>, []>;
  fetchDisclaimersCatalog: jest.Mock<
    Promise<{
      idOS: {
        key: string;
        version: string;
        title: string;
        url: string;
        consented: boolean;
      }[];
      kycProvider: {
        key: string;
        version: string;
        title: string;
        url: string;
        consented: boolean;
      }[];
    }>,
    [{ country: string }]
  >;
};

const MOCK_SESSION_CATALOG = {
  idOS: [
    {
      key: 'idos-tos',
      version: '1',
      title: 'idOS ToS',
      url: 'https://idos.example/tos',
      consented: false,
    },
  ],
  kycProvider: [
    {
      key: 'sumsub-tos',
      version: '2',
      title: 'SumSub ToS',
      url: 'https://sumsub.example/tos',
      consented: false,
    },
  ],
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
    mockKycService.getGeoCountry.mockResolvedValue('BRA');
    mockKycService.fetchDisclaimersCatalog.mockResolvedValue(
      MOCK_SESSION_CATALOG,
    );
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
    mockKycService.getGeoCountry.mockResolvedValue('BRA');
    mockKycService.fetchDisclaimersCatalog.mockResolvedValue(
      MOCK_SESSION_CATALOG,
    );
    resetControllerState();
  });

  it('creates the Iron customer then accepts terms from the fetched catalog', async () => {
    await startIronKycVerification('user@example.com');

    expect(mockKycController.createVendorCustomer).toHaveBeenCalledWith({
      vendor: 'iron',
      email: 'user@example.com',
    });
    expect(mockKycService.getGeoCountry).toHaveBeenCalledTimes(1);
    expect(mockKycService.fetchDisclaimersCatalog).toHaveBeenCalledWith({
      country: 'BRA',
    });
    expect(mockKycController.acceptTermsAndStartSession).toHaveBeenCalledWith({
      email: 'user@example.com',
      product: 'money',
      providerDisclaimersAccepted: [{ key: 'sumsub-tos', version: '2' }],
      idosDisclaimersAccepted: [{ key: 'idos-tos', version: '1' }],
    });
  });

  it('fetches the catalog for the country returned by getGeoCountry', async () => {
    mockKycService.getGeoCountry.mockResolvedValue('USA');

    await startIronKycVerification('user@example.com');

    expect(mockKycService.fetchDisclaimersCatalog).toHaveBeenCalledWith({
      country: 'USA',
    });
  });

  it('throws the error the controller recorded while creating the customer', async () => {
    mockKycController.createVendorCustomer.mockImplementation(async () => {
      mockKycController.state.error = 'Iron customer creation failed.';
    });

    await expect(startIronKycVerification('user@example.com')).rejects.toThrow(
      'Iron customer creation failed.',
    );
    expect(mockKycService.getGeoCountry).not.toHaveBeenCalled();
    expect(mockKycService.fetchDisclaimersCatalog).not.toHaveBeenCalled();
    expect(mockKycController.acceptTermsAndStartSession).not.toHaveBeenCalled();
  });

  it('throws without starting a session when no disclaimers are loaded', async () => {
    resetControllerState({ vendorDisclaimers: [] });

    await expect(startIronKycVerification('user@example.com')).rejects.toThrow(
      'Terms are not loaded yet.',
    );
    expect(mockKycService.fetchDisclaimersCatalog).not.toHaveBeenCalled();
    expect(mockKycController.acceptTermsAndStartSession).not.toHaveBeenCalled();
  });

  it('throws when the session disclaimer catalog fetch fails', async () => {
    mockKycService.fetchDisclaimersCatalog.mockRejectedValue(
      new Error('Catalog unavailable'),
    );

    await expect(startIronKycVerification('user@example.com')).rejects.toThrow(
      'Catalog unavailable',
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
