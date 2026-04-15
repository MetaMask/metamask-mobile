import { Messenger } from '@metamask/messenger';
import { CardController, defaultCardControllerState } from './CardController';
import {
  type CardControllerActions,
  type CardControllerEvents,
  type CardControllerMessenger,
} from './types';
import {
  CardProviderError,
  CardProviderErrorCode,
  type ICardProvider,
  type CardAuthSession,
  type CardAuthTokens,
} from './provider-types';
import { CardTokenStore } from './CardTokenStore';

jest.mock('./CardTokenStore');
jest.mock('../../../../util/Logger');

const mockTokenStore = CardTokenStore as jest.Mocked<typeof CardTokenStore>;

function buildMessenger() {
  return new Messenger<
    'CardController',
    CardControllerActions,
    CardControllerEvents
  >({ namespace: 'CardController' });
}

function buildMockMessenger(
  overrides: Partial<CardControllerMessenger> = {},
): jest.Mocked<CardControllerMessenger> {
  return {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    call: jest.fn(),
    publish: jest.fn(),
    registerActionHandler: jest.fn(),
    unregisterActionHandler: jest.fn(),
    clearEventSubscriptions: jest.fn(),
    registerInitialEventPayload: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<CardControllerMessenger>;
}

function buildMockProvider(
  overrides: Partial<ICardProvider> = {},
): jest.Mocked<ICardProvider> {
  return {
    id: 'baanx',
    capabilities: {} as ICardProvider['capabilities'],
    initiateAuth: jest.fn(),
    submitCredentials: jest.fn(),
    executeStepAction: jest.fn(),
    refreshTokens: jest.fn(),
    validateTokens: jest.fn(),
    logout: jest.fn(),
    getCardHomeData: jest.fn(),
    getCardDetails: jest.fn(),
    freezeCard: jest.fn(),
    unfreezeCard: jest.fn(),
    ...overrides,
  } as jest.Mocked<ICardProvider>;
}

function buildController(
  provider: ICardProvider,
  stateOverrides: Partial<typeof defaultCardControllerState> = {},
) {
  return new CardController({
    messenger: buildMessenger(),
    providers: { baanx: provider },
    state: {
      activeProviderId: 'baanx',
      ...stateOverrides,
    },
  });
}

const mockSession: CardAuthSession = {
  id: 'session-1',
  currentStep: { type: 'email_password' },
  _metadata: {
    initiateToken: 'tok',
    location: 'international',
    state: 's',
    codeVerifier: 'cv',
  },
};

const mockTokenSet: CardAuthTokens = {
  accessToken: 'at',
  refreshToken: 'rt',
  accessTokenExpiresAt: Date.now() + 3_600_000,
  refreshTokenExpiresAt: Date.now() + 86_400_000,
  location: 'international',
};

describe('CardController', () => {
  it('initializes with default state when no state is provided', () => {
    const controller = new CardController({
      messenger: buildMessenger(),
      providers: {},
    });

    expect(controller.state).toStrictEqual(defaultCardControllerState);
  });

  it('initializes with provided state merged over defaults', () => {
    const controller = new CardController({
      messenger: buildMessenger(),
      providers: {},
      state: {
        selectedCountry: 'US',
        activeProviderId: 'baanx',
        isAuthenticated: true,
      },
    });

    expect(controller.state).toStrictEqual({
      selectedCountry: 'US',
      activeProviderId: 'baanx',
      isAuthenticated: true,
      cardholderAccounts: [],
      providerData: {},
    });
  });

  it('preserves default values for fields not in partial state', () => {
    const controller = new CardController({
      messenger: buildMessenger(),
      providers: {},
      state: {
        selectedCountry: 'GB',
      },
    });

    expect(controller.state.selectedCountry).toBe('GB');
    expect(controller.state.activeProviderId).toBe('baanx');
    expect(controller.state.isAuthenticated).toBe(false);
    expect(controller.state.cardholderAccounts).toStrictEqual([]);
    expect(controller.state.providerData).toStrictEqual({});
  });

  it('initializes with full persisted state including providerData', () => {
    const controller = new CardController({
      messenger: buildMessenger(),
      providers: {},
      state: {
        selectedCountry: 'US',
        activeProviderId: 'baanx',
        isAuthenticated: true,
        cardholderAccounts: ['eip155:1:0xabc'],
        providerData: {
          baanx: { location: 'us' },
        },
      },
    });

    expect(controller.state.cardholderAccounts).toStrictEqual([
      'eip155:1:0xabc',
    ]);
    expect(controller.state.providerData).toStrictEqual({
      baanx: { location: 'us' },
    });
  });
});

describe('CardController — auth methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateAuth', () => {
    it('delegates to the active provider and stores the session internally', async () => {
      const provider = buildMockProvider();
      provider.initiateAuth.mockResolvedValue(mockSession);
      const controller = buildController(provider);

      await controller.initiateAuth('US');

      expect(provider.initiateAuth).toHaveBeenCalledWith('US');
      expect(controller.getCurrentAuthStep()).toStrictEqual(
        mockSession.currentStep,
      );
    });

    it('throws CardProviderError when there is no active provider', async () => {
      const controller = new CardController({
        messenger: buildMessenger(),
        providers: {},
        state: { activeProviderId: null },
      });

      await expect(controller.initiateAuth('US')).rejects.toBeInstanceOf(
        CardProviderError,
      );
    });
  });

  describe('submitCredentials', () => {
    it('throws when no session has been initiated', async () => {
      const provider = buildMockProvider();
      const controller = buildController(provider);

      await expect(
        controller.submitCredentials({
          type: 'email_password',
          email: 'a@b.com',
          password: 'pass',
        }),
      ).rejects.toMatchObject({ code: CardProviderErrorCode.Unknown });
    });

    it('stores tokens, sets isAuthenticated and providerData on done:true', async () => {
      const provider = buildMockProvider();
      provider.initiateAuth.mockResolvedValue(mockSession);
      provider.submitCredentials.mockResolvedValue({
        done: true,
        tokenSet: mockTokenSet,
      });
      mockTokenStore.set.mockResolvedValue(true);
      const controller = buildController(provider);

      await controller.initiateAuth('US');
      const result = await controller.submitCredentials({
        type: 'email_password',
        email: 'a@b.com',
        password: 'pass',
      });

      expect(mockTokenStore.set).toHaveBeenCalledWith('baanx', mockTokenSet);
      expect(controller.state.isAuthenticated).toBe(true);
      expect(controller.state.providerData.baanx).toStrictEqual({
        location: 'international',
      });
      expect(result.done).toBe(true);
    });

    it('still sets isAuthenticated when token store write fails', async () => {
      const provider = buildMockProvider();
      provider.initiateAuth.mockResolvedValue(mockSession);
      provider.submitCredentials.mockResolvedValue({
        done: true,
        tokenSet: mockTokenSet,
      });
      mockTokenStore.set.mockResolvedValue(false);
      const controller = buildController(provider);

      await controller.initiateAuth('US');
      await controller.submitCredentials({
        type: 'email_password',
        email: 'a@b.com',
        password: 'pass',
      });

      expect(controller.state.isAuthenticated).toBe(true);
    });

    it('updates currentSession step when OTP step is required', async () => {
      const provider = buildMockProvider();
      provider.initiateAuth.mockResolvedValue(mockSession);
      provider.submitCredentials.mockResolvedValue({
        done: false,
        nextStep: { type: 'otp', destination: '+1555****90' },
      });
      const controller = buildController(provider);

      await controller.initiateAuth('US');
      const result = await controller.submitCredentials({
        type: 'email_password',
        email: 'a@b.com',
        password: 'pass',
      });

      expect(controller.state.isAuthenticated).toBe(false);
      expect(result.done).toBe(false);
      expect(controller.getCurrentAuthStep()).toStrictEqual({
        type: 'otp',
        destination: '+1555****90',
      });
    });

    it('clears session when onboarding is required', async () => {
      const provider = buildMockProvider();
      provider.initiateAuth.mockResolvedValue(mockSession);
      provider.submitCredentials.mockResolvedValue({
        done: false,
        onboardingRequired: { sessionId: 'ob-session', phase: 'kyc' },
      });
      const controller = buildController(provider);

      await controller.initiateAuth('US');
      const result = await controller.submitCredentials({
        type: 'email_password',
        email: 'a@b.com',
        password: 'pass',
      });

      expect(controller.state.isAuthenticated).toBe(false);
      expect(result.onboardingRequired?.phase).toBe('kyc');
      expect(controller.getCurrentAuthStep()).toBeNull();
    });
  });

  describe('executeStepAction', () => {
    it('throws when no session has been initiated', async () => {
      const provider = buildMockProvider();
      const controller = buildController(provider);

      await expect(controller.executeStepAction()).rejects.toMatchObject({
        code: CardProviderErrorCode.Unknown,
      });
    });

    it('delegates to the provider with the current session', async () => {
      const provider = buildMockProvider();
      provider.initiateAuth.mockResolvedValue(mockSession);
      (provider.executeStepAction as jest.Mock).mockResolvedValue(undefined);
      const controller = buildController(provider);

      await controller.initiateAuth('US');
      await controller.executeStepAction();

      expect(provider.executeStepAction).toHaveBeenCalledWith(mockSession);
    });

    it('is a no-op when the provider does not implement executeStepAction', async () => {
      const provider = buildMockProvider({ executeStepAction: undefined });
      provider.initiateAuth.mockResolvedValue(mockSession);
      const controller = buildController(provider);

      await controller.initiateAuth('US');
      await expect(controller.executeStepAction()).resolves.toBeUndefined();
    });
  });

  describe('logout', () => {
    it('calls provider.logout, removes tokens, sets isAuthenticated to false', async () => {
      const provider = buildMockProvider();
      provider.logout.mockResolvedValue(undefined);
      mockTokenStore.get.mockResolvedValue(mockTokenSet);
      mockTokenStore.remove.mockResolvedValue(true);
      const controller = buildController(provider, { isAuthenticated: true });

      await controller.logout();

      expect(provider.logout).toHaveBeenCalledWith(mockTokenSet);
      expect(mockTokenStore.remove).toHaveBeenCalledWith('baanx');
      expect(controller.state.isAuthenticated).toBe(false);
    });

    it('still clears local state when provider.logout throws', async () => {
      const provider = buildMockProvider();
      provider.logout.mockRejectedValue(new Error('Server error'));
      mockTokenStore.get.mockResolvedValue(mockTokenSet);
      mockTokenStore.remove.mockResolvedValue(true);
      const controller = buildController(provider, { isAuthenticated: true });

      await controller.logout();

      expect(mockTokenStore.remove).toHaveBeenCalledWith('baanx');
      expect(controller.state.isAuthenticated).toBe(false);
    });

    it('skips provider.logout call when no tokens exist', async () => {
      const provider = buildMockProvider();
      mockTokenStore.get.mockResolvedValue(null);
      mockTokenStore.remove.mockResolvedValue(true);
      const controller = buildController(provider);

      await controller.logout();

      expect(provider.logout).not.toHaveBeenCalled();
      expect(mockTokenStore.remove).toHaveBeenCalledWith('baanx');
    });
  });

  describe('validateAndRefreshSession', () => {
    it('returns isAuthenticated:false when no tokens exist', async () => {
      const provider = buildMockProvider();
      mockTokenStore.get.mockResolvedValue(null);
      const controller = buildController(provider);

      const result = await controller.validateAndRefreshSession();

      expect(result).toStrictEqual({ isAuthenticated: false });
      expect(controller.state.isAuthenticated).toBe(false);
    });

    it('returns isAuthenticated:true with location when tokens are valid', async () => {
      const provider = buildMockProvider();
      mockTokenStore.get.mockResolvedValue(mockTokenSet);
      provider.validateTokens.mockReturnValue('valid');
      const controller = buildController(provider);

      const result = await controller.validateAndRefreshSession();

      expect(result).toStrictEqual({
        isAuthenticated: true,
        location: 'international',
      });
      expect(controller.state.isAuthenticated).toBe(true);
    });

    it('refreshes tokens and returns authenticated when needs_refresh', async () => {
      const provider = buildMockProvider();
      const refreshedTokens: CardAuthTokens = {
        ...mockTokenSet,
        accessToken: 'new-at',
      };
      mockTokenStore.get.mockResolvedValue(mockTokenSet);
      provider.validateTokens.mockReturnValue('needs_refresh');
      provider.refreshTokens.mockResolvedValue(refreshedTokens);
      mockTokenStore.set.mockResolvedValue(true);
      const controller = buildController(provider);

      const result = await controller.validateAndRefreshSession();

      expect(provider.refreshTokens).toHaveBeenCalledWith(mockTokenSet);
      expect(mockTokenStore.set).toHaveBeenCalledWith('baanx', refreshedTokens);
      expect(result).toStrictEqual({
        isAuthenticated: true,
        location: 'international',
      });
    });

    it('clears tokens and returns unauthenticated when refresh fails', async () => {
      const provider = buildMockProvider();
      mockTokenStore.get.mockResolvedValue(mockTokenSet);
      provider.validateTokens.mockReturnValue('needs_refresh');
      provider.refreshTokens.mockRejectedValue(new Error('Refresh failed'));
      mockTokenStore.remove.mockResolvedValue(true);
      const controller = buildController(provider);

      const result = await controller.validateAndRefreshSession();

      expect(mockTokenStore.remove).toHaveBeenCalledWith('baanx');
      expect(result).toStrictEqual({ isAuthenticated: false });
      expect(controller.state.isAuthenticated).toBe(false);
    });

    it('clears tokens and returns unauthenticated when tokens are expired', async () => {
      const provider = buildMockProvider();
      mockTokenStore.get.mockResolvedValue(mockTokenSet);
      provider.validateTokens.mockReturnValue('expired');
      mockTokenStore.remove.mockResolvedValue(true);
      const controller = buildController(provider);

      const result = await controller.validateAndRefreshSession();

      expect(mockTokenStore.remove).toHaveBeenCalledWith('baanx');
      expect(result).toStrictEqual({ isAuthenticated: false });
      expect(controller.state.isAuthenticated).toBe(false);
    });

    it('persists location in providerData when tokens are valid', async () => {
      const provider = buildMockProvider();
      mockTokenStore.get.mockResolvedValue({ ...mockTokenSet, location: 'us' });
      provider.validateTokens.mockReturnValue('valid');
      const controller = buildController(provider);

      await controller.validateAndRefreshSession();

      expect(controller.state.providerData.baanx).toStrictEqual({
        location: 'us',
      });
    });

    it('persists location in providerData after token refresh', async () => {
      const provider = buildMockProvider();
      const refreshedTokens: CardAuthTokens = {
        ...mockTokenSet,
        accessToken: 'new-at',
        location: 'us',
      };
      mockTokenStore.get.mockResolvedValue(mockTokenSet);
      provider.validateTokens.mockReturnValue('needs_refresh');
      provider.refreshTokens.mockResolvedValue(refreshedTokens);
      mockTokenStore.set.mockResolvedValue(true);
      const controller = buildController(provider);

      await controller.validateAndRefreshSession();

      expect(controller.state.providerData.baanx).toStrictEqual({
        location: 'us',
      });
    });
  });
});

describe('CardController — event subscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes to KeyringController:unlock on construction', () => {
    const mockMessenger = buildMockMessenger();
    new CardController({
      messenger: mockMessenger,
      providers: {},
    });

    expect(mockMessenger.subscribe).toHaveBeenCalledWith(
      'KeyringController:unlock',
      expect.any(Function),
    );
  });

  it('subscribes to AccountTreeController:stateChange on construction', () => {
    const mockMessenger = buildMockMessenger();
    new CardController({
      messenger: mockMessenger,
      providers: {},
    });

    expect(mockMessenger.subscribe).toHaveBeenCalledWith(
      'AccountTreeController:stateChange',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('calls validateAndRefreshSession on KeyringController:unlock', async () => {
    const provider = buildMockProvider();
    mockTokenStore.get.mockResolvedValue(null);

    const mockMessenger = buildMockMessenger();
    (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
      if (action === 'AccountsController:getState') {
        return { internalAccounts: { accounts: {} } };
      }
      if (action === 'RemoteFeatureFlagController:getState') {
        return { remoteFeatureFlags: {} };
      }
      return undefined;
    });

    const controller = new CardController({
      messenger: mockMessenger,
      providers: { baanx: provider },
      state: { activeProviderId: 'baanx' },
    });

    const validateSpy = jest
      .spyOn(controller, 'validateAndRefreshSession')
      .mockResolvedValue({ isAuthenticated: false });

    // Simulate unlock event
    const unlockHandler = (
      mockMessenger.subscribe as jest.Mock
    ).mock.calls.find(([event]) => event === 'KeyringController:unlock')?.[1];
    await unlockHandler?.();

    expect(validateSpy).toHaveBeenCalledTimes(1);
  });
});

describe('CardController — checkCardholderAccounts', () => {
  const accountsApiUrl = 'https://accounts.api.example.com/';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores cardholder accounts returned by the API', async () => {
    const caipIds = [
      'eip155:0:0xabc' as `${string}:${string}:${string}`,
      'eip155:0:0xdef' as `${string}:${string}:${string}`,
    ];
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ is: ['eip155:0:0xabc'] }),
    });

    const provider = buildMockProvider();
    const controller = buildController(provider);

    await controller.checkCardholderAccounts(caipIds, accountsApiUrl);

    expect(controller.state.cardholderAccounts).toStrictEqual([
      'eip155:0:0xabc',
    ]);
  });

  it('stores empty array when API returns no cardholder accounts', async () => {
    const caipIds = ['eip155:0:0xabc' as `${string}:${string}:${string}`];
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ is: [] }),
    });

    const provider = buildMockProvider();
    const controller = buildController(provider);

    await controller.checkCardholderAccounts(caipIds, accountsApiUrl);

    expect(controller.state.cardholderAccounts).toStrictEqual([]);
  });

  it('is a no-op when caipAccountIds is empty', async () => {
    const provider = buildMockProvider();
    const controller = buildController(provider);

    await controller.checkCardholderAccounts([], accountsApiUrl);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(controller.state.cardholderAccounts).toStrictEqual([]);
  });

  it('leaves state unchanged and logs error when API call fails', async () => {
    const caipIds = ['eip155:0:0xabc' as `${string}:${string}:${string}`];
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const provider = buildMockProvider();
    const controller = buildController(provider, {
      cardholderAccounts: ['eip155:0:0xprev'],
    });

    await controller.checkCardholderAccounts(caipIds, accountsApiUrl);

    expect(controller.state.cardholderAccounts).toStrictEqual([
      'eip155:0:0xprev',
    ]);
  });

  it('batches requests for more than BATCH_SIZE accounts', async () => {
    const caipIds = Array.from(
      { length: 55 },
      (_, i) =>
        `eip155:0:0x${i.toString(16).padStart(4, '0')}` as `${string}:${string}:${string}`,
    );
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ is: [] }),
    });

    const provider = buildMockProvider();
    const controller = buildController(provider);

    await controller.checkCardholderAccounts(caipIds, accountsApiUrl);

    // 55 accounts → 2 batches (50 + 5)
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('caps at MAX_BATCHES (3) even with more than 150 accounts', async () => {
    const caipIds = Array.from(
      { length: 160 },
      (_, i) =>
        `eip155:0:0x${i.toString(16).padStart(4, '0')}` as `${string}:${string}:${string}`,
    );
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ is: [] }),
    });

    const provider = buildMockProvider();
    const controller = buildController(provider);

    await controller.checkCardholderAccounts(caipIds, accountsApiUrl);

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
