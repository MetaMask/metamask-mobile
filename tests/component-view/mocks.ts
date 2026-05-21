/**
 * Component view test mocks:
 * - ONLY Engine (business) and minimal native mocks.
 */

// Engine mock (singleton default export)
jest.mock('../../app/core/Engine', () => {
  const engine = {
    acceptPendingApproval: jest.fn().mockResolvedValue(undefined),
    rejectPendingApproval: jest.fn().mockResolvedValue(undefined),
    context: {
      KeyringController: {
        state: {
          keyrings: [],
        },
        removeAccount: jest.fn().mockResolvedValue(undefined),
        verifyPassword: jest.fn().mockResolvedValue(undefined),
        exportAccount: jest.fn().mockResolvedValue(''),
        getAccountKeyringType: jest.fn().mockReturnValue('HD Key Tree'),
      },
      AccountsController: {
        state: {
          internalAccounts: {
            accounts: {},
            selectedAccount: '',
          },
          accountIdByAddress: {},
        },
        listAccounts: jest.fn().mockReturnValue([]),
        listMultichainAccounts: jest.fn().mockReturnValue([]),
        setAccountName: jest.fn(),
      },
      AccountTreeController: {
        setAccountGroupName: jest.fn(),
        setSelectedAccountGroup: jest.fn(),
      },
      MultichainAccountService: {
        alignWallets: jest.fn().mockResolvedValue(undefined),
        createNextMultichainAccountGroup: jest.fn().mockResolvedValue({
          id: 'entropy:wallet1/1',
          metadata: { name: 'Account 2' },
          accounts: [],
        }),
        setBasicFunctionality: jest.fn().mockResolvedValue(undefined),
      },
      UserStorageController: {
        setIsBackupAndSyncFeatureEnabled: jest
          .fn()
          .mockResolvedValue(undefined),
        syncContactsWithUserStorage: jest.fn().mockResolvedValue(undefined),
      },
      AddressBookController: {
        set: jest.fn(),
        delete: jest.fn(),
      },
      AccountTrackerController: {
        state: {
          accounts: {},
        },
        refresh() {
          return undefined;
        },
      },
      PermissionController: {
        state: {
          subjects: {},
        },
        revokePermission: jest.fn(),
        updateCaveat: jest.fn(),
      },
      GasFeeController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
        getGasFeeEstimatesAndStartPolling: jest
          .fn()
          .mockResolvedValue('poll-token'),
        stopPolling: jest.fn(),
        disconnectPoller: jest.fn(),
      },
      PreferencesController: {
        state: {
          securityAlertsEnabled: true,
        },
        setTokenNetworkFilter() {
          return undefined;
        },
      },
      TokensController: {
        addTokens() {
          return undefined;
        },
      },
      NftDetectionController: {
        detectNfts() {
          return undefined;
        },
      },
      CurrencyRateController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      TokenRatesController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      TokenBalancesController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      TokenDetectionController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      MultichainNetworkController: {
        async setActiveNetwork() {
          return undefined;
        },
      },
      NetworkEnablementController: {
        enableNetworkInNamespace() {
          return undefined;
        },
        enableNetwork() {
          return undefined;
        },
        disableNetwork() {
          return undefined;
        },
        enableAllPopularNetworks() {
          return undefined;
        },
        listPopularEvmNetworks() {
          return [];
        },
        listPopularMultichainNetworks() {
          return [];
        },
        listPopularNetworks() {
          return [];
        },
      },
      MultichainAssetsRatesController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      AuthenticationController: {
        getBearerToken: jest.fn().mockResolvedValue('mock-bearer-token'),
      },
      // Notifications: stubbed so notification view + settings flows can call
      // controller methods (enable / disable / toggleFeatureAnnouncements /
      // markMetamaskNotificationsAsRead / fetchAndUpdateMetamaskNotifications
      // / enableAccounts / disableAccounts) without touching the real services.
      NotificationServicesController: {
        state: {
          isNotificationServicesEnabled: true,
          isFeatureAnnouncementsEnabled: true,
          metamaskNotificationsList: [],
          metamaskNotificationsReadList: [],
        },
        enableMetamaskNotifications: jest.fn().mockResolvedValue(undefined),
        disableMetamaskNotifications: jest.fn().mockResolvedValue(undefined),
        enableNotificationServices: jest.fn().mockResolvedValue(undefined),
        disableNotificationServices: jest.fn().mockResolvedValue(undefined),
        enablePushNotifications: jest.fn().mockResolvedValue(undefined),
        disablePushNotifications: jest.fn().mockResolvedValue(undefined),
        setFeatureAnnouncementsEnabled: jest.fn().mockResolvedValue(undefined),
        toggleFeatureAnnouncements: jest.fn().mockResolvedValue(undefined),
        markMetamaskNotificationsAsRead: jest.fn().mockResolvedValue(undefined),
        fetchAndUpdateMetamaskNotifications: jest
          .fn()
          .mockResolvedValue(undefined),
        enableAccounts: jest.fn().mockResolvedValue(undefined),
        disableAccounts: jest.fn().mockResolvedValue(undefined),
        createOnChainTriggers: jest.fn().mockResolvedValue(undefined),
        checkAccountsPresence: jest
          .fn()
          .mockResolvedValue({} as Record<string, boolean>),
      },
      NotificationServicesPushController: {
        state: { isPushEnabled: true, fcmToken: 'mock-fcm-token' },
        enablePushNotifications: jest.fn().mockResolvedValue(undefined),
        disablePushNotifications: jest.fn().mockResolvedValue(undefined),
        updateTriggerPushNotifications: jest.fn().mockResolvedValue(undefined),
      },
      RemoteFeatureFlagController: {
        state: {
          remoteFeatureFlags: {
            assetsNotificationsEnabled: true,
          },
        },
      },
      AiDigestController: {
        fetchMarketInsights: jest.fn().mockResolvedValue(null),
        fetchMarketOverview: jest.fn().mockResolvedValue(undefined),
      },
      RampsController: {
        setSelectedToken: jest.fn(),
        setSelectedProvider: jest.fn(),
        setSelectedPaymentMethod: jest.fn(),
        setUserRegion: jest.fn().mockResolvedValue(null),
        // Default stubs — tests override via `.mockReset().mockResolvedValue(...)`.
        // Stable resolved values let useRampsProviders / useRampsPaymentMethods
        // react-query layers run for real in component-view tests.
        getProviders: jest.fn().mockResolvedValue({ providers: [] }),
        getPaymentMethods: jest.fn().mockResolvedValue({ payments: [] }),
        getQuotes: jest.fn().mockResolvedValue({ success: [], error: [] }),
        getBuyWidgetData: jest.fn().mockResolvedValue(null),
      },
      AssetsContractController: {
        getTokenStandardAndDetails: jest.fn().mockResolvedValue({}),
        getERC721AssetSymbol: jest.fn().mockResolvedValue(undefined),
      },
      TransactionController: {
        state: {
          transactions: [],
        },
        addTransaction: jest.fn().mockResolvedValue({}),
        getTransactions: jest.fn().mockReturnValue([]),
        updateEditableParams: jest.fn(),
        getNonceLock: jest
          .fn()
          .mockResolvedValue({ nextNonce: 0, releaseLock: jest.fn() }),
      },
      NetworkController: {
        state: { networksMetadata: {} },
        getProviderAndBlockTracker() {
          return {
            provider: {
              request: jest.fn().mockResolvedValue(null),
              sendAsync: jest.fn(),
            },
            blockTracker: {
              on: jest.fn(),
              removeListener: jest.fn(),
            },
          };
        },
        findNetworkClientIdByChainId() {
          return '';
        },
        getNetworkConfigurationByNetworkClientId() {
          return null;
        },
        getNetworkClientById(id: string) {
          const twoEthHex = '0x1bc16d674ec80000';
          const hundredEthHex = '0x56BC75E2D63100000';
          const pad32 = (hex: string) => {
            const v = hex.startsWith('0x') ? hex.slice(2) : hex;
            return `0x${v.padStart(64, '0')}`;
          };
          const provider = {
            request: jest.fn(
              async (args: { method: string; params?: unknown[] }) => {
                if (args?.method === 'eth_chainId') return '0x1';
                if (args?.method === 'net_version') return '1';
                if (args?.method === 'eth_blockNumber') return '0xabcdef';
                if (args?.method === 'eth_getBalance') {
                  return hundredEthHex;
                }
                if (args?.method === 'eth_call') {
                  return pad32(twoEthHex);
                }
                return null;
              },
            ),
            on: jest.fn(),
            removeListener: jest.fn(),
          };
          return { id, provider };
        },
      },
      BridgeController: {
        updateBridgeQuoteRequestParams: jest.fn().mockResolvedValue(undefined),
        resetState: jest.fn(),
        stopAllPolling: jest.fn(),
        setLocation: jest.fn(),
        trackUnifiedSwapBridgeEvent: jest.fn(),
      },
      PredictController: {
        getMarkets: jest.fn().mockResolvedValue({
          markets: [],
          nextCursor: null,
        }),
        searchMarkets: jest
          .fn()
          .mockResolvedValue({ markets: [], totalResults: 0 }),
        getMarket: jest.fn().mockResolvedValue(null),
        getBalance: jest.fn().mockResolvedValue(0),
        getPositions: jest.fn().mockResolvedValue([]),
        getPrices: jest.fn().mockResolvedValue({ providerId: '', results: [] }),
        getMarketSeries: jest.fn().mockResolvedValue([]),
        getCryptoPriceHistory: jest.fn().mockResolvedValue([]),
        getCryptoTargetPrice: jest.fn().mockResolvedValue(69000),
        subscribeToMarketPrices: jest.fn(() => () => undefined),
        subscribeToCryptoPrices: jest.fn(() => () => undefined),
        getConnectionStatus: jest.fn(() => ({ marketConnected: false })),
        trackFeedViewed: jest.fn(),
        trackTabChanged: jest.fn(),
        trackBannerAction: jest.fn(),
        trackMarketDetailsOpened: jest.fn(),
        trackGeoBlockTriggered: jest.fn(),
        refreshEligibility: jest.fn().mockResolvedValue(undefined),
      },
      // Perps: stub so hooks (usePerpsClosePosition, usePerpsMarkets, etc.) do not throw
      // getMarkets returns one market so PerpsTabView explore section renders "See all perps"
      PerpsController: {
        state: { isTestnet: false },
        init: jest.fn().mockResolvedValue({ success: true }),
        disconnect: jest.fn().mockResolvedValue(undefined),
        getActiveProvider: jest.fn(() => ({
          ping: jest.fn().mockResolvedValue(true),
          getOrderFills: jest.fn().mockResolvedValue([]),
        })),
        getActiveProviderOrNull: jest.fn(() => null),
        switchProvider: jest.fn().mockResolvedValue({ success: true }),
        subscribeToPrices: jest.fn(() => () => undefined),
        getOrderFills: jest.fn().mockResolvedValue([]),
        closePosition: jest.fn().mockResolvedValue({
          success: true,
          orderId: 'component-view-close',
        }),
        cancelOrder: jest.fn().mockResolvedValue({ success: true }),
        getPositions: jest.fn().mockResolvedValue([]),
        getMarkets: jest.fn().mockResolvedValue([
          {
            symbol: 'ETH',
            name: 'ETH',
            maxLeverage: '50x',
            price: '$2,500',
            change24h: '$0',
            change24hPercent: '0%',
            volume: '$1M',
            szDecimals: 2,
          },
          {
            symbol: 'BTC',
            name: 'Bitcoin',
            maxLeverage: '50x',
            price: '$50,000',
            change24h: '$0',
            change24hPercent: '0%',
            volume: '$1M',
          },
        ]),
        getOrders: jest.fn().mockResolvedValue([]),
        getOpenOrders: jest.fn().mockResolvedValue([]),
        getAccountState: jest.fn().mockResolvedValue(null),
        depositWithOrder: jest.fn().mockResolvedValue({
          result: Promise.resolve('0xcomponent-view-deposit'),
        }),
        depositWithConfirmation: jest.fn().mockResolvedValue({
          result: Promise.resolve('0xcomponent-view-deposit'),
        }),
        placeOrder: jest.fn().mockResolvedValue({
          success: true,
          orderId: 'component-view-order',
        }),
        clearDepositResult: jest.fn(),
        calculateFees: jest.fn().mockResolvedValue({}),
        calculateLiquidationPrice: jest.fn().mockResolvedValue('0.00'),
        calculateMaintenanceMargin: jest.fn().mockResolvedValue(100),
        flipPosition: jest.fn().mockResolvedValue({ success: false }),
        updatePositionTPSL: jest.fn().mockResolvedValue({ success: true }),
        updateMargin: jest.fn().mockResolvedValue({ success: true }),
        withdraw: jest.fn().mockResolvedValue({ success: true }),
        validateOrder: jest.fn().mockResolvedValue({ isValid: true }),
        validateClosePosition: jest
          .fn()
          .mockResolvedValue({ isValid: true, errors: [] }),
        validateWithdrawal: jest.fn().mockResolvedValue({ isValid: true }),
        cancelOrders: jest.fn().mockResolvedValue({
          success: true,
          successCount: 1,
          failureCount: 0,
        }),
        closePositions: jest.fn().mockResolvedValue({
          success: true,
          successCount: 1,
          failureCount: 0,
        }),
        savePendingTradeConfiguration: jest.fn(),
        clearPendingTradeConfiguration: jest.fn(),
        setSelectedPaymentToken: jest.fn(),
        getTradeConfiguration: jest.fn().mockResolvedValue(null),
        getMarketFilterPreferences: jest.fn().mockResolvedValue({}),
        getOrderBookGrouping: jest.fn().mockResolvedValue(null),
        getWithdrawalRoutes: jest.fn(() => [
          {
            assetId: 'usdc-mainnet',
            constraints: { minAmount: 10 },
          },
        ]),
        startMarketDataPreload: jest.fn(),
        stopMarketDataPreload: jest.fn(),
        isCurrentlyReinitializing: jest.fn().mockReturnValue(false),
        markTutorialCompleted: jest.fn(),
        resetFirstTimeUserState: jest.fn(),
        clearPendingTransactionRequests: jest.fn(),
      },
    },
    controllerMessenger: {
      subscribe() {
        return undefined;
      },
      unsubscribe() {
        return undefined;
      },
      call(action: string, ...args: unknown[]) {
        // Non-EVM (e.g. TRON) amount validation calls SnapController:handleRequest with onAmountInput
        const params = args[0] as { request?: { method?: string } } | undefined;
        if (
          action === 'SnapController:handleRequest' &&
          params?.request?.method === 'onAmountInput'
        ) {
          return Promise.resolve({ valid: true, errors: [] });
        }
        return Promise.resolve(undefined);
      },
    },
    getTotalEvmFiatAccountBalance() {
      return { balance: '0', fiatBalance: '0' };
    },
    async lookupEnabledNetworks() {
      return undefined;
    },
  };
  return { __esModule: true, default: engine };
});

// Minimal Engine/Engine singleton where needed
jest.mock('../../app/core/Engine/Engine.ts', () => {
  const singleton = {
    get context() {
      return {
        MultichainNetworkController: {
          async setActiveNetwork() {
            return undefined;
          },
          async getNetworksWithTransactionActivityByAccounts() {
            return undefined;
          },
        },
      };
    },
    get controllerMessenger() {
      return {
        subscribe() {
          return undefined;
        },
        unsubscribe() {
          return undefined;
        },
        call(_action: string, ..._args: unknown[]) {
          return Promise.resolve(undefined);
        },
      };
    },
  };
  return { __esModule: true, default: singleton };
});

// Native deterministic version for gating logic
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  getVersion: () => '99.0.0',
}));

// Mock Animated Easing to avoid importing heavy bezier implementation during tests
// and to prevent late imports after Jest environment teardown.
jest.mock('react-native/Libraries/Animated/Easing', () => {
  const identity = (t: number) => t;
  const returnIdentity = () => identity;
  const wrapIdentity = () => identity;

  const easing = {
    // Core easings
    linear: identity,
    ease: identity,
    quad: identity,
    cubic: identity,
    poly: () => identity,
    sin: identity,
    circle: identity,
    exp: identity,
    elastic: returnIdentity,
    back: returnIdentity,
    bounce: identity,
    // Bezier should return an easing function
    bezier: returnIdentity,
    // Composition helpers usually accept an easing and return easing
    in: wrapIdentity,
    out: wrapIdentity,
    inOut: wrapIdentity,
  };

  return { __esModule: true, default: easing, ...easing };
});
