import Engine from '../../../../../core/Engine';
import {
  registerSelectedMoneyAccountWallet,
  startIronKycFlow,
  startIronKycVerification,
} from './ironKycFlow';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn(),
    },
    KycController: {
      state: { error: null, disclaimers: [] },
      initialize: jest.fn(),
      createIronCustomer: jest.fn(),
      acceptTermsAndStartSession: jest.fn(),
      registerMoneyAccountWallet: jest.fn(),
    },
  },
}));

const mockAccountsController = Engine.context.AccountsController as unknown as {
  getSelectedAccount: jest.Mock;
};

const mockKycController = Engine.context.KycController as unknown as {
  state: { error: string | null; disclaimers: { id: string }[] };
  initialize: jest.Mock<Promise<void>, [unknown?]>;
  createIronCustomer: jest.Mock<Promise<void>, [unknown?]>;
  acceptTermsAndStartSession: jest.Mock<Promise<void>, [unknown?]>;
  registerMoneyAccountWallet: jest.Mock<Promise<unknown>, [unknown?]>;
};

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

  it('ignores an error left behind by an earlier attempt', async () => {
    resetControllerState({ error: 'Stale failure from a previous attempt.' });

    await expect(startIronKycFlow()).resolves.toBeUndefined();
  });
});

describe('startIronKycVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycController.initialize.mockResolvedValue(undefined);
    mockKycController.createIronCustomer.mockResolvedValue(undefined);
    mockKycController.acceptTermsAndStartSession.mockResolvedValue(undefined);
    resetControllerState();
  });

  it('creates the Iron customer then accepts terms to start the session', async () => {
    await startIronKycVerification('user@example.com');

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

describe('registerSelectedMoneyAccountWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountsController.getSelectedAccount.mockReturnValue({
      address: '0xabc',
    });
    mockKycController.registerMoneyAccountWallet.mockResolvedValue({
      type: 'registered',
    });
  });

  it('registers the selected account address with KycController', async () => {
    await registerSelectedMoneyAccountWallet();

    expect(mockKycController.registerMoneyAccountWallet).toHaveBeenCalledWith({
      address: '0xabc',
    });
  });

  it('throws when no selected account is available', async () => {
    mockAccountsController.getSelectedAccount.mockReturnValue(undefined);

    await expect(registerSelectedMoneyAccountWallet()).rejects.toThrow(
      'No selected account available to register.',
    );
    expect(mockKycController.registerMoneyAccountWallet).not.toHaveBeenCalled();
  });
});
