import { Messenger } from '@metamask/messenger';
import type { Json } from '@metamask/utils';
import { CardController, defaultCardControllerState } from './CardController';
import {
  type CardControllerActions,
  type CardControllerEvents,
  type CardControllerMessenger,
} from './types';
import {
  CardProviderError,
  CardProviderErrorCode,
  CardStatus,
  CardType,
  FundingAssetStatus,
  type ICardProvider,
  type CardAuthSession,
  type CardAuthTokens,
  type CardHomeData,
  type CardFundingAsset,
} from './provider-types';
import { CardTokenStore } from './CardTokenStore';

jest.mock('./CardTokenStore');
jest.mock('../../../../util/Logger');

const mockTokenStore = CardTokenStore as jest.Mocked<typeof CardTokenStore>;

async function flushPromises(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

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
    updateAssetPriority: jest.fn(),
    getOnChainAssets: jest.fn(),
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

function buildMessengerWithEvmAccount(address = '0xabc') {
  const messenger = buildMockMessenger();
  (messenger.call as jest.Mock).mockImplementation((action: string) => {
    if (action === 'AccountsController:getState') {
      return {
        internalAccounts: {
          accounts: {
            'id-1': { address, type: 'eip155:eoa', scopes: ['eip155:0'] },
          },
          selectedAccount: 'id-1',
        },
      };
    }
    if (action === 'RemoteFeatureFlagController:getState') {
      return { remoteFeatureFlags: {} };
    }
    return undefined;
  });
  return messenger;
}

function buildControllerWithMockMessenger(
  provider: ICardProvider,
  stateOverrides: Partial<typeof defaultCardControllerState> = {},
  evmAddress = '0xabc',
) {
  const messenger = buildMessengerWithEvmAccount(evmAddress);
  const controller = new CardController({
    messenger,
    providers: { baanx: provider },
    state: { activeProviderId: 'baanx', ...stateOverrides },
  });
  return { controller, messenger };
}

const mockCard = {
  id: 'card-1',
  status: CardStatus.ACTIVE,
  type: CardType.VIRTUAL,
  lastFour: '1234',
};

const mockAsset: CardFundingAsset = {
  address: '0xusdctoken',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  walletAddress: '0xwallet1',
  chainId: 'eip155:59144' as `eip155:${number}`,
  spendableBalance: '100',
  spendingCap: '100',
  priority: 1,
  status: FundingAssetStatus.Active,
};

const mockCardHomeData: CardHomeData = {
  primaryFundingAsset: mockAsset,
  fundingAssets: [mockAsset],
  availableFundingAssets: [],
  card: mockCard,
  account: null,
  alerts: [],
  actions: [],
  delegationSettings: null,
};

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
    expect(controller.state.cardHomeData).toBeNull();
    expect(controller.state.cardHomeDataStatus).toBe('idle');
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
      cardHomeData: null,
      cardHomeDataStatus: 'idle',
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

    it('drops in-flight unauthenticated card home data after successful auth', async () => {
      const staleAsset = { ...mockAsset, symbol: 'STALE' };
      const staleHomeData = {
        ...mockCardHomeData,
        primaryFundingAsset: staleAsset,
        fundingAssets: [staleAsset],
      };
      const authenticatedAsset = { ...mockAsset, symbol: 'AUTH' };
      const authenticatedHomeData = {
        ...mockCardHomeData,
        primaryFundingAsset: authenticatedAsset,
        fundingAssets: [authenticatedAsset],
      };
      let resolveStaleFetch: (data: CardHomeData) => void = () => undefined;

      const provider = buildMockProvider();
      const getOnChainAssetsMock =
        provider.getOnChainAssets as jest.MockedFunction<
          NonNullable<ICardProvider['getOnChainAssets']>
        >;
      provider.initiateAuth.mockResolvedValue(mockSession);
      provider.submitCredentials.mockResolvedValue({
        done: true,
        tokenSet: mockTokenSet,
      });
      getOnChainAssetsMock.mockReturnValue(
        new Promise<CardHomeData>((resolve) => {
          resolveStaleFetch = resolve;
        }),
      );
      provider.validateTokens.mockReturnValue('valid');
      provider.getCardHomeData.mockResolvedValue(authenticatedHomeData);
      mockTokenStore.get
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockTokenSet);
      mockTokenStore.set.mockResolvedValue(true);

      const { controller } = buildControllerWithMockMessenger(provider);
      const staleFetchPromise = controller.fetchCardHomeData();
      await flushPromises();

      expect(getOnChainAssetsMock).toHaveBeenCalledTimes(1);

      await controller.initiateAuth('US');
      await controller.submitCredentials({
        type: 'email_password',
        email: 'a@b.com',
        password: 'pass',
      });
      await flushPromises();

      expect(provider.getCardHomeData).toHaveBeenCalledTimes(1);
      expect(controller.state.cardHomeData).toStrictEqual(
        authenticatedHomeData,
      );

      resolveStaleFetch(staleHomeData);
      await staleFetchPromise;
      await flushPromises();

      expect(controller.state.cardHomeData).toStrictEqual(
        authenticatedHomeData,
      );
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
      const controller = buildController(provider, {
        isAuthenticated: true,
      });

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
      const controller = buildController(provider, {
        isAuthenticated: true,
      });

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

    it('clears cardHomeData and resets cardHomeDataStatus to idle on logout', async () => {
      const provider = buildMockProvider();
      provider.logout.mockResolvedValue(undefined);
      mockTokenStore.get.mockResolvedValue(mockTokenSet);
      mockTokenStore.remove.mockResolvedValue(true);
      const controller = buildController(provider, {
        isAuthenticated: true,
        cardHomeData: mockCardHomeData as unknown as Record<string, null>,
        cardHomeDataStatus: 'success',
      });

      await controller.logout();

      expect(controller.state.cardHomeData).toBeNull();
      expect(controller.state.cardHomeDataStatus).toBe('idle');
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

    it('calls fetchCardHomeData even when no tokens exist', async () => {
      const provider = buildMockProvider();
      mockTokenStore.get.mockResolvedValue(null);
      const controller = buildController(provider);
      const fetchSpy = jest
        .spyOn(controller, 'fetchCardHomeData')
        .mockResolvedValue();

      await controller.validateAndRefreshSession();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('calls fetchCardHomeData when tokens are valid', async () => {
      const provider = buildMockProvider();
      mockTokenStore.get.mockResolvedValue(mockTokenSet);
      provider.validateTokens.mockReturnValue('valid');
      const controller = buildController(provider);
      const fetchSpy = jest
        .spyOn(controller, 'fetchCardHomeData')
        .mockResolvedValue();

      await controller.validateAndRefreshSession();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
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

  it('subscribes to RemoteFeatureFlagController:stateChange on construction', () => {
    const mockMessenger = buildMockMessenger();
    new CardController({
      messenger: mockMessenger,
      providers: {},
    });

    expect(mockMessenger.subscribe).toHaveBeenCalledWith(
      'RemoteFeatureFlagController:stateChange',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('clears and refetches card home data when the card feature flag changes', () => {
    const provider = buildMockProvider();
    const { controller, messenger } = buildControllerWithMockMessenger(
      provider,
      {
        cardHomeData: mockCardHomeData as unknown as Record<string, null>,
        cardHomeDataStatus: 'success',
      },
    );
    const fetchSpy = jest
      .spyOn(controller, 'fetchCardHomeData')
      .mockResolvedValue();

    const remoteFeatureFlagHandler = (
      messenger.subscribe as jest.Mock
    ).mock.calls.find(
      ([event]) => event === 'RemoteFeatureFlagController:stateChange',
    )?.[1];

    remoteFeatureFlagHandler?.('{}');

    expect(controller.state.cardHomeData).toBeNull();
    expect(controller.state.cardHomeDataStatus).toBe('idle');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
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

describe('CardController — fetchCardHomeData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets cardHomeDataStatus to success and populates cardHomeData on happy path', async () => {
    const provider = buildMockProvider();
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');
    provider.getCardHomeData.mockResolvedValue(mockCardHomeData);
    const { controller } = buildControllerWithMockMessenger(provider);

    await controller.fetchCardHomeData();

    expect(controller.state.cardHomeDataStatus).toBe('success');
    expect(controller.state.cardHomeData).toStrictEqual(mockCardHomeData);
  });

  it('sets cardHomeDataStatus to error and leaves cardHomeData null on provider throw', async () => {
    const provider = buildMockProvider();
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');
    provider.getCardHomeData.mockRejectedValue(new Error('API error'));
    const { controller } = buildControllerWithMockMessenger(provider);

    await controller.fetchCardHomeData();

    expect(controller.state.cardHomeDataStatus).toBe('error');
    expect(controller.state.cardHomeData).toBeNull();
  });

  it('deduplicates concurrent calls — provider fetched only once', async () => {
    const provider = buildMockProvider();
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');

    let resolveFetch: (data: CardHomeData) => void = () => undefined;
    provider.getCardHomeData.mockReturnValue(
      new Promise<CardHomeData>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const { controller } = buildControllerWithMockMessenger(provider);

    const p1 = controller.fetchCardHomeData();
    const p2 = controller.fetchCardHomeData();

    resolveFetch(mockCardHomeData);
    await Promise.all([p1, p2]);

    expect(provider.getCardHomeData).toHaveBeenCalledTimes(1);
  });

  it('drops stale response after logout increments the generation counter', async () => {
    const provider = buildMockProvider();
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');
    provider.logout.mockResolvedValue(undefined);
    mockTokenStore.remove.mockResolvedValue(true);

    let resolveFetch: (data: CardHomeData) => void = () => undefined;
    provider.getCardHomeData.mockReturnValue(
      new Promise<CardHomeData>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const { controller } = buildControllerWithMockMessenger(provider);

    const fetchPromise = controller.fetchCardHomeData();
    await controller.logout();

    resolveFetch(mockCardHomeData);
    await fetchPromise;

    // State should remain as logout left it, not updated with stale data
    expect(controller.state.cardHomeData).toBeNull();
    expect(controller.state.cardHomeDataStatus).toBe('idle');
  });

  it('returns early without changing status when no EVM address is selected', async () => {
    const provider = buildMockProvider();
    const messenger = buildMockMessenger();
    (messenger.call as jest.Mock).mockImplementation((action: string) => {
      if (action === 'AccountsController:getState') {
        return { internalAccounts: { accounts: {}, selectedAccount: '' } };
      }
      return undefined;
    });
    const controller = new CardController({
      messenger,
      providers: { baanx: provider },
      state: { activeProviderId: 'baanx' },
    });

    await controller.fetchCardHomeData();

    expect(controller.state.cardHomeDataStatus).toBe('idle');
    expect(provider.getCardHomeData).not.toHaveBeenCalled();
  });
});

describe('CardController — freezeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies optimistic frozen status before API call resolves', async () => {
    const provider = buildMockProvider();
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');

    let resolveFreeze: () => void = () => undefined;
    provider.freezeCard.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveFreeze = resolve;
      }),
    );
    provider.getCardDetails.mockResolvedValue({
      ...mockCard,
      status: CardStatus.FROZEN,
    });

    const { controller } = buildControllerWithMockMessenger(provider, {
      cardHomeData: mockCardHomeData as unknown as Record<string, null>,
      cardHomeDataStatus: 'success',
    });

    const freezePromise = controller.freezeCard('card-1');

    // Optimistic state applied immediately
    const optimisticData = controller.state
      .cardHomeData as unknown as typeof mockCardHomeData;
    expect(optimisticData?.card?.status).toBe(CardStatus.FROZEN);

    resolveFreeze();
    await freezePromise;
  });

  it('updates card with fresh data from getCardDetails after successful freeze', async () => {
    const provider = buildMockProvider();
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');
    provider.freezeCard.mockResolvedValue(undefined);
    const freshCard = { ...mockCard, status: CardStatus.FROZEN };
    provider.getCardDetails.mockResolvedValue(freshCard);

    const { controller } = buildControllerWithMockMessenger(provider, {
      cardHomeData: mockCardHomeData as unknown as Record<string, null>,
      cardHomeDataStatus: 'success',
    });

    await controller.freezeCard('card-1');

    const finalData = controller.state
      .cardHomeData as unknown as typeof mockCardHomeData;
    expect(finalData?.card?.status).toBe(CardStatus.FROZEN);
  });

  it('rolls back to previous state when API call fails', async () => {
    const provider = buildMockProvider();
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');
    provider.freezeCard.mockRejectedValue(new Error('freeze failed'));

    const { controller } = buildControllerWithMockMessenger(provider, {
      cardHomeData: mockCardHomeData as unknown as Record<string, null>,
      cardHomeDataStatus: 'success',
    });

    await expect(controller.freezeCard('card-1')).rejects.toThrow(
      'freeze failed',
    );

    const rolledBackData = controller.state
      .cardHomeData as unknown as typeof mockCardHomeData;
    expect(rolledBackData?.card?.status).toBe(CardStatus.ACTIVE);
  });

  it('still calls API when cardHomeData is null (no optimistic patch)', async () => {
    const provider = buildMockProvider();
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');
    provider.freezeCard.mockResolvedValue(undefined);
    provider.getCardDetails.mockResolvedValue({
      ...mockCard,
      status: CardStatus.FROZEN,
    });

    const { controller } = buildControllerWithMockMessenger(provider);

    await controller.freezeCard('card-1');

    expect(provider.freezeCard).toHaveBeenCalledWith('card-1', mockTokenSet);
  });
});

describe('CardController — unfreezeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies optimistic active status before API call resolves', async () => {
    const provider = buildMockProvider();
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');

    let resolveUnfreeze: () => void = () => undefined;
    provider.unfreezeCard.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveUnfreeze = resolve;
      }),
    );
    provider.getCardDetails.mockResolvedValue({
      ...mockCard,
      status: CardStatus.ACTIVE,
    });

    const frozenHomeData = {
      ...mockCardHomeData,
      card: { ...mockCard, status: CardStatus.FROZEN },
    };
    const { controller } = buildControllerWithMockMessenger(provider, {
      cardHomeData: frozenHomeData as unknown as Record<string, null>,
      cardHomeDataStatus: 'success',
    });

    const unfreezePromise = controller.unfreezeCard('card-1');

    const optimisticData = controller.state
      .cardHomeData as unknown as typeof mockCardHomeData;
    expect(optimisticData?.card?.status).toBe(CardStatus.ACTIVE);

    resolveUnfreeze();
    await unfreezePromise;
  });

  it('rolls back to frozen status when unfreeze API call fails', async () => {
    const provider = buildMockProvider();
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');
    provider.unfreezeCard.mockRejectedValue(new Error('unfreeze failed'));

    const frozenHomeData = {
      ...mockCardHomeData,
      card: { ...mockCard, status: CardStatus.FROZEN },
    };
    const { controller } = buildControllerWithMockMessenger(provider, {
      cardHomeData: frozenHomeData as unknown as Record<string, null>,
      cardHomeDataStatus: 'success',
    });

    await expect(controller.unfreezeCard('card-1')).rejects.toThrow(
      'unfreeze failed',
    );

    const rolledBackData = controller.state
      .cardHomeData as unknown as typeof mockCardHomeData;
    expect(rolledBackData?.card?.status).toBe(CardStatus.FROZEN);
  });
});

describe('CardController — updateAssetPriority', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const assetA: CardFundingAsset = {
    ...mockAsset,
    symbol: 'USDC',
    walletAddress: '0xwallet1',
    priority: 1,
    spendableBalance: '0',
  };
  const assetB: CardFundingAsset = {
    ...mockAsset,
    address: '0xusdttoken',
    symbol: 'USDT',
    walletAddress: '0xwallet2',
    priority: 2,
    spendableBalance: '100',
  };

  it('optimistically reorders assets with selected asset at priority 1', async () => {
    const provider = buildMockProvider();
    const mockUpdateAssetPriority =
      provider.updateAssetPriority as jest.MockedFunction<
        NonNullable<ICardProvider['updateAssetPriority']>
      >;
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');

    let resolveUpdate: () => void = () => undefined;
    mockUpdateAssetPriority.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    const homeData = { ...mockCardHomeData, fundingAssets: [assetA, assetB] };
    const { controller } = buildControllerWithMockMessenger(provider, {
      cardHomeData: homeData as unknown as Record<string, null>,
      cardHomeDataStatus: 'success',
    });

    const updatePromise = controller.updateAssetPriority(assetB, [
      assetA,
      assetB,
    ]);

    // assetB should be priority 1 optimistically
    const optimisticData = controller.state
      .cardHomeData as unknown as typeof homeData;
    expect(optimisticData?.fundingAssets?.[0]?.symbol).toBe('USDT');
    expect(optimisticData?.fundingAssets?.[0]?.priority).toBe(1);

    resolveUpdate();
    await updatePromise;
  });

  it('optimistically updates primaryAsset via pickPrimaryFromReordered', async () => {
    const provider = buildMockProvider();
    const mockUpdateAssetPriority =
      provider.updateAssetPriority as jest.MockedFunction<
        NonNullable<ICardProvider['updateAssetPriority']>
      >;
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');
    mockUpdateAssetPriority.mockResolvedValue(undefined);

    // assetA has balance '0', assetB has balance '100'
    const homeData = {
      ...mockCardHomeData,
      fundingAssets: [assetA, assetB],
      primaryFundingAsset: assetA,
    };
    const { controller } = buildControllerWithMockMessenger(provider, {
      cardHomeData: homeData as unknown as Record<string, null>,
      cardHomeDataStatus: 'success',
    });

    // Promote assetB (has balance) to priority 1
    await controller.updateAssetPriority(assetB, [assetA, assetB]);

    const finalData = controller.state
      .cardHomeData as unknown as typeof homeData;
    // assetB has balance so it should be the primary
    expect(finalData?.primaryFundingAsset?.symbol).toBe('USDT');
  });

  it('rolls back to previous asset order when API call fails', async () => {
    const provider = buildMockProvider();
    const mockUpdateAssetPriority =
      provider.updateAssetPriority as jest.MockedFunction<
        NonNullable<ICardProvider['updateAssetPriority']>
      >;
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');
    mockUpdateAssetPriority.mockRejectedValue(new Error('update failed'));

    const homeData = { ...mockCardHomeData, fundingAssets: [assetA, assetB] };
    const { controller } = buildControllerWithMockMessenger(provider, {
      cardHomeData: homeData as unknown as Record<string, null>,
      cardHomeDataStatus: 'success',
    });

    await expect(
      controller.updateAssetPriority(assetB, [assetA, assetB]),
    ).rejects.toThrow('update failed');

    const rolledBackData = controller.state
      .cardHomeData as unknown as typeof homeData;
    // Original order restored
    expect(rolledBackData?.fundingAssets?.[0]?.symbol).toBe('USDC');
  });
});

describe('CardController — account switch (#handleAccountSwitch)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function getAccountTreeHandler(
    messenger: jest.Mocked<CardControllerMessenger>,
  ) {
    return (messenger.subscribe as jest.Mock).mock.calls.find(
      ([event]: [string]) => event === 'AccountTreeController:stateChange',
    )?.[1] as ((key: string) => void) | undefined;
  }

  it('clears cardHomeData and calls fetchCardHomeData when account changes (authenticated)', async () => {
    const provider = buildMockProvider();
    const { controller, messenger } = buildControllerWithMockMessenger(
      provider,
      {
        isAuthenticated: true,
        cardHomeData: mockCardHomeData as unknown as Record<string, null>,
        cardHomeDataStatus: 'success',
      },
      '0xold',
    );

    const fetchSpy = jest
      .spyOn(controller, 'fetchCardHomeData')
      .mockResolvedValue();

    // Simulate initial trigger (sets previousEvmAddress to '0xold')
    const handler = getAccountTreeHandler(messenger);
    await handler?.('');
    fetchSpy.mockClear();
    // Seed state again (handler cleared it)
    // Change account
    (messenger.call as jest.Mock).mockImplementation((action: string) => {
      if (action === 'AccountsController:getState') {
        return {
          internalAccounts: {
            accounts: {
              'id-2': {
                address: '0xnew',
                type: 'eip155:eoa',
                scopes: ['eip155:0'],
              },
            },
            selectedAccount: 'id-2',
          },
        };
      }
      if (action === 'RemoteFeatureFlagController:getState') {
        return { remoteFeatureFlags: {} };
      }
      return undefined;
    });

    await handler?.('');

    expect(controller.state.cardHomeData).toBeNull();
    expect(controller.state.cardHomeDataStatus).toBe('idle');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('clears cardHomeData and calls fetchCardHomeData when account changes (unauthenticated)', async () => {
    const provider = buildMockProvider();
    const { controller, messenger } = buildControllerWithMockMessenger(
      provider,
      {
        isAuthenticated: false,
        cardHomeData: mockCardHomeData as unknown as Record<string, null>,
        cardHomeDataStatus: 'success',
      },
      '0xold',
    );

    const fetchSpy = jest
      .spyOn(controller, 'fetchCardHomeData')
      .mockResolvedValue();

    const handler = getAccountTreeHandler(messenger);
    // First trigger: sets previousEvmAddress to '0xold'
    await handler?.('');
    fetchSpy.mockClear();

    // Switch to new account
    (messenger.call as jest.Mock).mockImplementation((action: string) => {
      if (action === 'AccountsController:getState') {
        return {
          internalAccounts: {
            accounts: {
              'id-2': {
                address: '0xnew',
                type: 'eip155:eoa',
                scopes: ['eip155:0'],
              },
            },
            selectedAccount: 'id-2',
          },
        };
      }
      if (action === 'RemoteFeatureFlagController:getState') {
        return { remoteFeatureFlags: {} };
      }
      return undefined;
    });

    await handler?.('');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not clear state or refetch when address is unchanged', async () => {
    const provider = buildMockProvider();
    const { controller, messenger } = buildControllerWithMockMessenger(
      provider,
      {
        cardHomeData: mockCardHomeData as unknown as Record<string, null>,
        cardHomeDataStatus: 'success',
      },
      '0xabc',
    );

    const fetchSpy = jest
      .spyOn(controller, 'fetchCardHomeData')
      .mockResolvedValue();

    const handler = getAccountTreeHandler(messenger);
    // First trigger: sets previousEvmAddress to '0xabc'
    await handler?.('');
    fetchSpy.mockClear();

    // Same address — no switch
    await handler?.('');

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('CardController — setUserLocation', () => {
  it('writes location to providerData for the active provider', () => {
    const provider = buildMockProvider();
    const controller = buildController(provider);

    controller.setUserLocation('us');

    const providerData = controller.state.providerData as Record<
      string,
      Record<string, string>
    >;
    expect(providerData.baanx.location).toBe('us');
  });

  it('overwrites previous location', () => {
    const provider = buildMockProvider();
    const controller = buildController(provider);

    controller.setUserLocation('us');
    controller.setUserLocation('international');

    const providerData = controller.state.providerData as Record<
      string,
      Record<string, string>
    >;
    expect(providerData.baanx.location).toBe('international');
  });

  it('is a no-op when activeProviderId is falsy', () => {
    const provider = buildMockProvider();
    const controller = buildController(provider, { activeProviderId: '' });
    const before = { ...controller.state.providerData };

    controller.setUserLocation('us');

    expect(controller.state.providerData).toStrictEqual(before);
  });
});

describe('CardController — getCapabilities', () => {
  const baseCapabilities = {
    authMethod: 'email_password' as const,
    supportsOTP: true,
    supportsFundingApproval: true,
    supportsFundingLimits: true,
    fundingChains: ['eip155:59144'] as `${string}:${string}`[],
    supportsFreeze: true,
    supportsPushProvisioning: true,
    onboarding: {
      type: 'steps' as const,
      steps: [],
      kycProvider: 'veriff',
    },
    supportsPinView: false,
    supportsCashback: true,
  };

  it('returns base capabilities', () => {
    const provider = buildMockProvider({ capabilities: baseCapabilities });
    const controller = buildController(provider);

    const caps = controller.getCapabilities();
    expect(caps.supportsPinView).toBe(false);
    expect(caps.supportsCashback).toBe(true);
  });
});

describe('CardController — data pass-throughs', () => {
  function buildAuthenticatedController(provider: jest.Mocked<ICardProvider>) {
    mockTokenStore.get.mockResolvedValue(mockTokenSet);
    provider.validateTokens.mockReturnValue('valid');
    return buildControllerWithMockMessenger(provider, {
      isAuthenticated: true,
    });
  }

  describe('refreshCardStatus', () => {
    it('delegates to provider.getCardDetails', async () => {
      const provider = buildMockProvider();
      const { controller } = buildAuthenticatedController(provider);
      provider.getCardDetails.mockResolvedValue(mockCard);

      const result = await controller.refreshCardStatus();

      expect(result).toStrictEqual(mockCard);
      expect(provider.getCardDetails).toHaveBeenCalled();
    });

    it('returns null on error', async () => {
      const provider = buildMockProvider();
      provider.getCardDetails.mockImplementation(() => {
        throw new CardProviderError(
          CardProviderErrorCode.ServerError,
          'Server error',
          500,
        );
      });
      mockTokenStore.get.mockResolvedValue(mockTokenSet);
      provider.validateTokens.mockReturnValue('valid');
      const { controller } = buildControllerWithMockMessenger(provider, {
        isAuthenticated: true,
      });

      const result = await controller.refreshCardStatus();

      expect(result).toBeNull();
    });
  });

  describe('getCardDetailsView', () => {
    it('delegates to provider.getCardDetailsView', async () => {
      const mockGetCardDetailsView = jest.fn().mockResolvedValue({
        url: 'https://example.com',
        token: 'view-tok',
      });
      const provider = buildMockProvider({
        getCardDetailsView: mockGetCardDetailsView,
      });
      const { controller } = buildAuthenticatedController(provider);

      const result = await controller.getCardDetailsView({
        customCss: { card: 'color:red' },
      });

      expect(result).toStrictEqual({
        url: 'https://example.com',
        token: 'view-tok',
      });
    });

    it('throws when provider does not support getCardDetailsView', async () => {
      const provider = buildMockProvider({ getCardDetailsView: undefined });
      const { controller } = buildAuthenticatedController(provider);

      await expect(
        controller.getCardDetailsView({ customCss: {} }),
      ).rejects.toThrow('Card details view not supported');
    });
  });

  describe('getCardPinView', () => {
    it('delegates to provider.getCardPinView', async () => {
      const mockGetCardPinView = jest.fn().mockResolvedValue({
        url: 'https://pin.example.com',
        token: 'pin-tok',
      });
      const provider = buildMockProvider({
        getCardPinView: mockGetCardPinView,
      });
      const { controller } = buildAuthenticatedController(provider);

      const result = await controller.getCardPinView({
        customCss: { card: 'color:blue' },
      });

      expect(result).toStrictEqual({
        url: 'https://pin.example.com',
        token: 'pin-tok',
      });
    });

    it('throws when provider does not support getCardPinView', async () => {
      const provider = buildMockProvider({ getCardPinView: undefined });
      const { controller } = buildAuthenticatedController(provider);

      await expect(
        controller.getCardPinView({ customCss: {} }),
      ).rejects.toThrow('Card PIN view not supported');
    });
  });

  describe('getFundingConfig', () => {
    it('delegates to provider.getFundingConfig', async () => {
      const mockConfig = {
        maxLimit: 1000,
        fundingOptions: [],
        supportedChains: [],
      };
      const mockGetFundingConfig = jest.fn().mockResolvedValue(mockConfig);
      const provider = buildMockProvider({
        getFundingConfig: mockGetFundingConfig,
      });
      const { controller } = buildAuthenticatedController(provider);

      const result = await controller.getFundingConfig();
      expect(result).toStrictEqual(mockConfig);
    });

    it('throws when provider does not support getFundingConfig', async () => {
      const provider = buildMockProvider({ getFundingConfig: undefined });
      const { controller } = buildAuthenticatedController(provider);

      await expect(controller.getFundingConfig()).rejects.toThrow(
        'Funding config not supported',
      );
    });
  });

  describe('fetchDelegationChallenge', () => {
    it('delegates to provider.fetchDelegationChallenge', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        delegationToken: 'jwt',
        nonce: 'nonce-1',
        expiresAt: '2099-01-01',
      });
      const provider = buildMockProvider({
        fetchDelegationChallenge: mockFetch,
      });
      const { controller } = buildAuthenticatedController(provider);

      const result = await controller.fetchDelegationChallenge({
        network: 'linea',
        address: '0xabc',
        faucet: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        { network: 'linea', address: '0xabc', faucet: true },
        mockTokenSet,
      );
      expect(result).toStrictEqual({
        delegationToken: 'jwt',
        nonce: 'nonce-1',
        expiresAt: '2099-01-01',
      });
    });

    it('throws when provider does not support fetchDelegationChallenge', async () => {
      const provider = buildMockProvider({
        fetchDelegationChallenge: undefined,
      });
      const { controller } = buildAuthenticatedController(provider);

      await expect(
        controller.fetchDelegationChallenge({
          network: 'linea',
          address: '0xabc',
        }),
      ).rejects.toThrow('Delegation challenge not supported');
    });
  });

  describe('linkMoneyAccountCard', () => {
    const MONEY_ACCOUNT_ADDRESS = '0x000000000000000000000000000000000000dEaD';
    const TOKEN_ADDRESS = '0x0000000000000000000000000000000000000111';
    const DELEGATION_CONTRACT = '0x0000000000000000000000000000000000000222';
    const TX_HASH = '0xtxhash';

    const cardHomeDataWithMonadUsdc = {
      primaryFundingAsset: null,
      fundingAssets: [],
      availableFundingAssets: [],
      card: null,
      account: null,
      alerts: [],
      actions: [],
      delegationSettings: {
        count: 1,
        _links: { self: '/v1/delegation/chain/config' },
        networks: [
          {
            network: 'monad',
            environment: 'production',
            chainId: '143',
            delegationContract: DELEGATION_CONTRACT,
            tokens: {
              usdc: {
                symbol: 'USDC',
                decimals: 6,
                address: TOKEN_ADDRESS,
              },
            },
          },
        ],
      },
    } as unknown as Record<string, unknown>;

    interface LinkMessengerHandle {
      messenger: jest.Mocked<CardControllerMessenger>;
      emitConfirmed: (overrides?: Record<string, unknown>) => void;
      emitFailed: (errorMessage?: string) => void;
      subscribedHandlers: ((meta: unknown) => void)[];
      addTransactionCalls: unknown[][];
      signPersonalMessageCalls: unknown[][];
    }

    function buildLinkMessenger({
      addTransactionResult,
    }: {
      addTransactionResult?: () => Promise<{
        result: Promise<string>;
        transactionMeta: { id: string };
      }>;
    } = {}): LinkMessengerHandle {
      const confirmedHandlers: ((meta: unknown) => void)[] = [];
      const failedHandlers: ((payload: unknown) => void)[] = [];
      const addTransactionCalls: unknown[][] = [];
      const signPersonalMessageCalls: unknown[][] = [];

      const messenger = buildMockMessenger();

      (messenger.subscribe as jest.Mock).mockImplementation(
        (event: string, handler: (arg: unknown) => void) => {
          if (event === 'TransactionController:transactionConfirmed') {
            confirmedHandlers.push(handler);
          } else if (event === 'TransactionController:transactionFailed') {
            failedHandlers.push(handler);
          }
        },
      );

      (messenger.unsubscribe as jest.Mock).mockImplementation(
        (event: string, handler: (arg: unknown) => void) => {
          if (event === 'TransactionController:transactionConfirmed') {
            const index = confirmedHandlers.indexOf(handler);
            if (index >= 0) confirmedHandlers.splice(index, 1);
          } else if (event === 'TransactionController:transactionFailed') {
            const index = failedHandlers.indexOf(handler);
            if (index >= 0) failedHandlers.splice(index, 1);
          }
        },
      );

      (messenger.call as jest.Mock).mockImplementation(
        (action: string, ...args: unknown[]) => {
          if (action === 'AccountsController:getState') {
            return {
              internalAccounts: {
                accounts: {
                  'id-1': {
                    address: '0xabc',
                    type: 'eip155:eoa',
                    scopes: ['eip155:0'],
                  },
                },
                selectedAccount: 'id-1',
              },
            };
          }
          if (action === 'RemoteFeatureFlagController:getState') {
            return { remoteFeatureFlags: {} };
          }
          if (action === 'KeyringController:signPersonalMessage') {
            signPersonalMessageCalls.push(args);
            return Promise.resolve('0xsig');
          }
          if (action === 'NetworkController:findNetworkClientIdByChainId') {
            return 'monad-mainnet';
          }
          if (action === 'TransactionController:addTransaction') {
            addTransactionCalls.push(args);
            return (
              addTransactionResult?.() ??
              Promise.resolve({
                result: Promise.resolve(TX_HASH),
                transactionMeta: { id: 'tx-1' },
              })
            );
          }
          return undefined;
        },
      );

      return {
        messenger,
        emitConfirmed: (overrides = {}) => {
          for (const handler of [...confirmedHandlers]) {
            handler({ id: 'tx-1', status: 'confirmed', ...overrides });
          }
        },
        emitFailed: (errorMessage = 'reverted') => {
          for (const handler of [...failedHandlers]) {
            handler({ error: errorMessage, transactionMeta: { id: 'tx-1' } });
          }
        },
        subscribedHandlers: confirmedHandlers,
        addTransactionCalls,
        signPersonalMessageCalls,
      };
    }

    function buildLinkController({
      provider,
      messenger,
      withDelegationSettings = true,
    }: {
      provider: jest.Mocked<ICardProvider>;
      messenger: jest.Mocked<CardControllerMessenger>;
      withDelegationSettings?: boolean;
    }) {
      mockTokenStore.get.mockResolvedValue(mockTokenSet);
      provider.validateTokens.mockReturnValue('valid');
      return new CardController({
        messenger,
        providers: { baanx: provider },
        state: {
          activeProviderId: 'baanx',
          isAuthenticated: true,
          cardHomeData: withDelegationSettings
            ? (cardHomeDataWithMonadUsdc as unknown as Record<string, Json>)
            : null,
        },
      });
    }

    async function waitFor(
      predicate: () => boolean,
      iterations = 50,
    ): Promise<void> {
      for (let i = 0; i < iterations; i++) {
        if (predicate()) return;
        await Promise.resolve();
      }
      throw new Error('waitFor predicate never became true');
    }

    const mockGenerateSiwe = jest
      .fn()
      .mockReturnValue('siwe-message-from-baanx');

    it('signs, submits the approval, awaits confirmation, and calls provider.approveFunding', async () => {
      const mockChallenge = jest.fn().mockResolvedValue({
        delegationToken: 'jwt-1',
        nonce: 'nonce-1',
        expiresAt: '2099-01-01',
      });
      const mockApproveFunding = jest.fn().mockResolvedValue(undefined);
      const provider = buildMockProvider({
        fetchDelegationChallenge: mockChallenge,
        approveFunding: mockApproveFunding,
        generateCardDelegationSignatureMessage: mockGenerateSiwe,
      });

      const handle = buildLinkMessenger();
      const controller = buildLinkController({
        provider,
        messenger: handle.messenger,
      });
      const fetchCardHomeDataSpy = jest
        .spyOn(controller, 'fetchCardHomeData')
        .mockResolvedValue(undefined);

      const linkPromise = controller.linkMoneyAccountCard({
        moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
        delegationAmountHuman: '2199023255551',
      });

      await waitFor(() => handle.addTransactionCalls.length > 0);
      handle.emitConfirmed();

      await linkPromise;

      expect(mockChallenge).toHaveBeenCalledWith(
        { network: 'monad', address: MONEY_ACCOUNT_ADDRESS },
        mockTokenSet,
      );
      expect(handle.signPersonalMessageCalls).toHaveLength(1);
      expect(handle.signPersonalMessageCalls[0][0]).toMatchObject({
        from: MONEY_ACCOUNT_ADDRESS,
      });
      expect(handle.addTransactionCalls).toHaveLength(1);
      const [txParams, txOptions] = handle.addTransactionCalls[0] as [
        Record<string, unknown>,
        Record<string, unknown>,
      ];
      expect(txParams).toMatchObject({
        from: MONEY_ACCOUNT_ADDRESS,
        to: TOKEN_ADDRESS,
      });
      expect(txOptions).toMatchObject({
        requireApproval: false,
        networkClientId: 'monad-mainnet',
      });
      expect(mockGenerateSiwe).toHaveBeenCalledWith(
        expect.objectContaining({
          network: 'monad',
          address: MONEY_ACCOUNT_ADDRESS,
          nonce: 'nonce-1',
        }),
      );
      expect(mockApproveFunding).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MONEY_ACCOUNT_ADDRESS,
          network: 'monad',
          currency: 'usdc',
          amount: '2199023255551',
          txHash: TX_HASH,
          sigHash: '0xsig',
          sigMessage: 'siwe-message-from-baanx',
          token: 'jwt-1',
        }),
        mockTokenSet,
      );
      // Refreshes cardHomeData so selectIsMoneyAccountDelegatedForCard flips
      // to true immediately after a successful link — see the call right
      // after `provider.approveFunding` in CardController.linkMoneyAccountCard.
      expect(fetchCardHomeDataSpy).toHaveBeenCalledTimes(1);
    });

    it('still resolves when the post-link fetchCardHomeData refresh rejects (linkage already succeeded — refresh errors are swallowed)', async () => {
      const mockChallenge = jest.fn().mockResolvedValue({
        delegationToken: 'jwt-refresh',
        nonce: 'nonce-refresh',
        expiresAt: '2099-01-01',
      });
      const mockApproveFunding = jest.fn().mockResolvedValue(undefined);
      const provider = buildMockProvider({
        fetchDelegationChallenge: mockChallenge,
        approveFunding: mockApproveFunding,
        generateCardDelegationSignatureMessage: mockGenerateSiwe,
      });

      const handle = buildLinkMessenger();
      const controller = buildLinkController({
        provider,
        messenger: handle.messenger,
      });
      jest
        .spyOn(controller, 'fetchCardHomeData')
        .mockRejectedValue(new Error('refresh boom'));

      const linkPromise = controller.linkMoneyAccountCard({
        moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
        delegationAmountHuman: '2199023255551',
      });

      await waitFor(() => handle.addTransactionCalls.length > 0);
      handle.emitConfirmed();

      await expect(linkPromise).resolves.toBeUndefined();
      expect(mockApproveFunding).toHaveBeenCalledTimes(1);
    });

    it('subscribes to transactionConfirmed BEFORE submitting the transaction (closes the race)', async () => {
      const mockChallenge = jest.fn().mockResolvedValue({
        delegationToken: 'jwt-race',
        nonce: 'nonce-race',
        expiresAt: '2099-01-01',
      });
      const mockApproveFunding = jest.fn().mockResolvedValue(undefined);
      const provider = buildMockProvider({
        fetchDelegationChallenge: mockChallenge,
        approveFunding: mockApproveFunding,
        generateCardDelegationSignatureMessage: mockGenerateSiwe,
      });

      const handle = buildLinkMessenger();
      const controller = buildLinkController({
        provider,
        messenger: handle.messenger,
      });

      const linkPromise = controller.linkMoneyAccountCard({
        moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
        delegationAmountHuman: '2199023255551',
      });

      // Wait until the controller has both subscribed AND submitted the
      // addTransaction call. The first `mockApproveFunding` call still hasn't
      // happened because we haven't emitted `confirmed` yet — proving the
      // subscription is live before the confirmation can be observed.
      await waitFor(
        () =>
          handle.subscribedHandlers.length > 0 &&
          handle.addTransactionCalls.length > 0,
      );
      expect(mockApproveFunding).not.toHaveBeenCalled();

      handle.emitConfirmed();
      await linkPromise;

      expect(mockApproveFunding).toHaveBeenCalledTimes(1);
    });

    it('rejects when the approval transaction fails on-chain', async () => {
      const mockChallenge = jest.fn().mockResolvedValue({
        delegationToken: 'jwt-fail',
        nonce: 'nonce-fail',
        expiresAt: '2099-01-01',
      });
      const mockApproveFunding = jest.fn().mockResolvedValue(undefined);
      const provider = buildMockProvider({
        fetchDelegationChallenge: mockChallenge,
        approveFunding: mockApproveFunding,
        generateCardDelegationSignatureMessage: mockGenerateSiwe,
      });

      const handle = buildLinkMessenger();
      const controller = buildLinkController({
        provider,
        messenger: handle.messenger,
      });
      const fetchCardHomeDataSpy = jest
        .spyOn(controller, 'fetchCardHomeData')
        .mockResolvedValue(undefined);

      const linkPromise = controller.linkMoneyAccountCard({
        moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
        delegationAmountHuman: '2199023255551',
      });

      await waitFor(() => handle.addTransactionCalls.length > 0);
      handle.emitFailed('out of gas');

      await expect(linkPromise).rejects.toThrow('out of gas');
      expect(mockApproveFunding).not.toHaveBeenCalled();
      // Refresh is only triggered on the success path — failed transactions
      // must NOT refresh card home data.
      expect(fetchCardHomeDataSpy).not.toHaveBeenCalled();
    });

    it('fails closed when Monad USDC is missing from delegation settings (after refetch)', async () => {
      const provider = buildMockProvider({
        fetchDelegationChallenge: jest.fn(),
        approveFunding: jest.fn(),
        generateCardDelegationSignatureMessage: mockGenerateSiwe,
        getCardHomeData: jest.fn().mockResolvedValue({
          ...cardHomeDataWithMonadUsdc,
          delegationSettings: null,
        }),
      });

      const handle = buildLinkMessenger();
      const controller = buildLinkController({
        provider,
        messenger: handle.messenger,
        withDelegationSettings: false,
      });

      await expect(
        controller.linkMoneyAccountCard({
          moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
          delegationAmountHuman: '2199023255551',
        }),
      ).rejects.toThrow('Money Account Card spending token unavailable');
    });

    it('throws when provider lacks fetchDelegationChallenge, approveFunding, or generateCardDelegationSignatureMessage', async () => {
      const provider = buildMockProvider({
        fetchDelegationChallenge: undefined,
        approveFunding: undefined,
        generateCardDelegationSignatureMessage: undefined,
      });
      const handle = buildLinkMessenger();
      const controller = buildLinkController({
        provider,
        messenger: handle.messenger,
      });

      await expect(
        controller.linkMoneyAccountCard({
          moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
          delegationAmountHuman: '2199023255551',
        }),
      ).rejects.toThrow(
        'Money account card delegation is not supported for this provider',
      );
    });

    it('fails closed on an invalid Money Account address', async () => {
      const provider = buildMockProvider({
        fetchDelegationChallenge: jest.fn(),
        approveFunding: jest.fn(),
        generateCardDelegationSignatureMessage: mockGenerateSiwe,
      });
      const handle = buildLinkMessenger();
      const controller = buildLinkController({
        provider,
        messenger: handle.messenger,
      });

      await expect(
        controller.linkMoneyAccountCard({
          moneyAccountAddress: 'not-an-address',
          delegationAmountHuman: '2199023255551',
        }),
      ).rejects.toThrow('Invalid Money account address');
    });

    it('fails closed on a missing delegation amount', async () => {
      const provider = buildMockProvider({
        fetchDelegationChallenge: jest.fn(),
        approveFunding: jest.fn(),
        generateCardDelegationSignatureMessage: mockGenerateSiwe,
      });
      const handle = buildLinkMessenger();
      const controller = buildLinkController({
        provider,
        messenger: handle.messenger,
      });

      await expect(
        controller.linkMoneyAccountCard({
          moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
          delegationAmountHuman: '',
        }),
      ).rejects.toThrow('Delegation amount is required');
    });
  });

  describe('generateCardDelegationSignatureMessage', () => {
    it('delegates to the provider', () => {
      const provider = buildMockProvider({
        generateCardDelegationSignatureMessage: jest
          .fn()
          .mockReturnValue('siwe-out'),
      });
      const { controller } = buildAuthenticatedController(provider);

      const message = controller.generateCardDelegationSignatureMessage({
        network: 'monad',
        address: '0xabc',
        nonce: 'n',
      });

      expect(message).toBe('siwe-out');
      expect(
        provider.generateCardDelegationSignatureMessage,
      ).toHaveBeenCalledWith({
        network: 'monad',
        address: '0xabc',
        nonce: 'n',
      });
    });

    it('throws when provider does not support generateCardDelegationSignatureMessage', () => {
      const provider = buildMockProvider({
        generateCardDelegationSignatureMessage: undefined,
      });
      const { controller } = buildAuthenticatedController(provider);

      expect(() =>
        controller.generateCardDelegationSignatureMessage({
          network: 'monad',
          address: '0xabc',
          nonce: 'n',
        }),
      ).toThrow('Card delegation signature message not supported');
    });
  });

  describe('createGoogleWalletProvisioningRequest', () => {
    it('delegates to provider', async () => {
      const mockCreate = jest
        .fn()
        .mockResolvedValue({ opaquePaymentCard: 'opaque' });
      const provider = buildMockProvider({
        createGoogleWalletProvisioningRequest: mockCreate,
      });
      const { controller } = buildAuthenticatedController(provider);

      const result = await controller.createGoogleWalletProvisioningRequest();
      expect(result).toStrictEqual({ opaquePaymentCard: 'opaque' });
    });

    it('throws when unsupported', async () => {
      const provider = buildMockProvider({
        createGoogleWalletProvisioningRequest: undefined,
      });
      const { controller } = buildAuthenticatedController(provider);

      await expect(
        controller.createGoogleWalletProvisioningRequest(),
      ).rejects.toThrow('Google Wallet provisioning not supported');
    });
  });

  describe('createApplePayProvisioningRequest', () => {
    it('delegates to provider', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        encryptedPassData: 'enc',
        activationData: 'act',
        ephemeralPublicKey: 'epk',
      });
      const provider = buildMockProvider({
        createApplePayProvisioningRequest: mockCreate,
      });
      const { controller } = buildAuthenticatedController(provider);

      const result = await controller.createApplePayProvisioningRequest({
        leafCertificate: 'leaf',
        intermediateCertificate: 'inter',
        nonce: 'n',
        nonceSignature: 'ns',
      });
      expect(result.encryptedPassData).toBe('enc');
    });

    it('throws when unsupported', async () => {
      const provider = buildMockProvider({
        createApplePayProvisioningRequest: undefined,
      });
      const { controller } = buildAuthenticatedController(provider);

      await expect(
        controller.createApplePayProvisioningRequest({
          leafCertificate: 'l',
          intermediateCertificate: 'i',
          nonce: 'n',
          nonceSignature: 'ns',
        }),
      ).rejects.toThrow('Apple Pay provisioning not supported');
    });
  });

  describe('getCashbackWallet', () => {
    it('delegates to provider', async () => {
      const wallet = { id: 'w1', balance: '10', currency: 'musd' };
      const mockGet = jest.fn().mockResolvedValue(wallet);
      const provider = buildMockProvider({ getCashbackWallet: mockGet });
      const { controller } = buildAuthenticatedController(provider);

      const result = await controller.getCashbackWallet();
      expect(result).toStrictEqual(wallet);
    });

    it('throws when unsupported', async () => {
      const provider = buildMockProvider({ getCashbackWallet: undefined });
      const { controller } = buildAuthenticatedController(provider);

      await expect(controller.getCashbackWallet()).rejects.toThrow(
        'Cashback not supported',
      );
    });
  });

  describe('getCashbackWithdrawEstimation', () => {
    it('delegates to provider', async () => {
      const est = { estimatedAmount: '5', fee: '0.1' };
      const mockGet = jest.fn().mockResolvedValue(est);
      const provider = buildMockProvider({
        getCashbackWithdrawEstimation: mockGet,
      });
      const { controller } = buildAuthenticatedController(provider);

      const result = await controller.getCashbackWithdrawEstimation();
      expect(result).toStrictEqual(est);
    });

    it('throws when unsupported', async () => {
      const provider = buildMockProvider({
        getCashbackWithdrawEstimation: undefined,
      });
      const { controller } = buildAuthenticatedController(provider);

      await expect(controller.getCashbackWithdrawEstimation()).rejects.toThrow(
        'Cashback not supported',
      );
    });
  });

  describe('withdrawCashback', () => {
    it('delegates to provider', async () => {
      const resp = { txHash: '0x123' };
      const mockWithdraw = jest.fn().mockResolvedValue(resp);
      const provider = buildMockProvider({
        withdrawCashback: mockWithdraw,
      });
      const { controller } = buildAuthenticatedController(provider);

      const result = await controller.withdrawCashback({
        amount: '5',
        walletAddress: '0xaddr',
      } as never);
      expect(result).toStrictEqual(resp);
    });

    it('throws when unsupported', async () => {
      const provider = buildMockProvider({ withdrawCashback: undefined });
      const { controller } = buildAuthenticatedController(provider);

      await expect(
        controller.withdrawCashback({ amount: '5' } as never),
      ).rejects.toThrow('Cashback withdrawal not supported');
    });
  });

  describe('getCardHomeData — unauthenticated path', () => {
    it('falls back to getOnChainAssets when no valid tokens exist', async () => {
      const onChainData: CardHomeData = {
        primaryFundingAsset: mockAsset,
        fundingAssets: [mockAsset],
        availableFundingAssets: [mockAsset],
        card: null,
        account: null,
        alerts: [],
        actions: [{ type: 'add_funds', enabled: true }],
        delegationSettings: null,
      };
      const provider = buildMockProvider();
      const mockGetOnChainAssets = provider.getOnChainAssets as jest.Mock;
      mockGetOnChainAssets.mockResolvedValue(onChainData);
      mockTokenStore.get.mockResolvedValue(null);

      const { controller } = buildControllerWithMockMessenger(provider, {
        isAuthenticated: false,
      });

      const result = await controller.getCardHomeData('0xabc');

      expect(provider.getOnChainAssets).toHaveBeenCalledWith('0xabc');
      expect(provider.getCardHomeData).not.toHaveBeenCalled();
      expect(result).toStrictEqual(onChainData);
    });
  });
});
