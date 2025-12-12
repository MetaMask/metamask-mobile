import {
  startSpan as sentryStartSpan,
  startSpanManual,
  setMeasurement,
  Scope,
} from '@sentry/react-native';
import {
  type StartSpanOptions,
  type Span,
  withIsolationScope,
} from '@sentry/core';
import performance from 'react-native-performance';
import { createModuleLogger, createProjectLogger } from '@metamask/utils';
import { AGREED, METRICS_OPT_IN } from '../constants/storage';
import StorageWrapper from '../store/storage-wrapper';

// Cannot create this 'sentry' logger in Sentry util file because of circular dependency
const projectLogger = createProjectLogger('sentry');
const log = createModuleLogger(projectLogger, 'trace');
/**
 * The supported trace names.
 */
export enum TraceName {
  DeveloperTest = 'Developer Test',
  Middleware = 'Middleware',
  NestedTest1 = 'Nested Test 1',
  NestedTest2 = 'Nested Test 2',
  NotificationDisplay = 'Notification Display',
  PPOMValidation = 'PPOM Validation',
  Signature = 'Signature',
  LoadScripts = 'Load Scripts',
  LoginUserInteraction = 'Login User Interaction',
  AuthenticateUser = 'Authenticate User',
  LoginBiometricAuthentication = 'Login Biometrics Authentication',
  AppStartBiometricAuthentication = 'App start Biometrics Authentication',
  EngineInitialization = 'Engine Initialization',
  UIStartup = 'UI Startup',
  NavInit = 'Navigation Initialization',
  Login = 'Login',
  NetworkSwitch = 'Network Switch',
  SwitchBuiltInNetwork = 'Switch to Built in Network',
  SwitchCustomNetwork = 'Switch to Custom Network',
  VaultCreation = 'Login Vault Creation',
  StoreInit = 'Store Initialization',
  Tokens = 'Tokens List',
  CreateHdAccount = 'Create HD Account',
  ImportEvmAccount = 'Import EVM Account',
  CreateSnapAccount = 'Create Snap Account',
  SelectAccount = 'Select Account',
  AddNetwork = 'Add Network',
  UpdateNetwork = 'Update Network',
  AssetDetails = 'Asset Details',
  ImportNfts = 'Import Nfts',
  ImportTokens = 'Import Tokens',
  RampQuoteLoading = 'Ramp Quote Loading',
  LoadRampExperience = 'Load Ramp Experience',
  LoadDepositExperience = 'Load Deposit Experience',
  DepositContinueFlow = 'Deposit Continue Flow',
  DepositInputOtp = 'Deposit Input OTP',
  RevealSrp = 'Reveal SRP',
  RevealPrivateKey = 'Reveal Private Key',
  EvmDiscoverAccounts = 'EVM Discover Accounts',
  SnapDiscoverAccounts = 'Snap Discover Accounts',
  FetchHistoricalPrices = 'Fetch Historical Prices',
  TransactionConfirmed = 'Transaction Confirmed',
  LoadCollectibles = 'Load Collectibles',
  DetectNfts = 'Detect Nfts',
  DisconnectAllAccountPermissions = 'Disconnect All Account Permissions',
  OnboardingCreateWallet = 'Onboarding Create Wallet',
  QRTabSwitcher = 'QR Tab Switcher',
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  SampleFeatureListPetNames = 'Sample Feature List Pet Names',
  SampleFeatureAddPetName = 'Sample Feature Add Pet Name',
  ///: END:ONLY_INCLUDE_IF
  OnboardingNewSocialAccountExists = 'Onboarding - New Social Account Exists',
  OnboardingNewSocialCreateWallet = 'Onboarding - New Social Create Wallet',
  OnboardingNewSrpCreateWallet = 'Onboarding - New SRP Create Wallet',
  OnboardingExistingSocialLogin = 'Onboarding - Existing Social Login',
  OnboardingExistingSocialAccountNotFound = 'Onboarding - Existing Social Account Not Found',
  OnboardingExistingSrpImport = 'Onboarding - Existing SRP Import',
  OnboardingJourneyOverall = 'Onboarding - Overall Journey',
  OnboardingSocialLoginAttempt = 'Onboarding - Social Login Attempt',
  OnboardingPasswordSetupAttempt = 'Onboarding - Password Setup Attempt',
  OnboardingPasswordLoginAttempt = 'Onboarding - Password Login Attempt',
  OnboardingResetPassword = 'Onboarding - Reset Password',
  OnboardingCreateKeyAndBackupSrp = 'Onboarding - Create Key and Backup SRP',
  OnboardingAddSrp = 'Onboarding - Add SRP',
  OnboardingFetchSrps = 'Onboarding - Fetch SRPs',
  OnboardingOAuthProviderLogin = 'Onboarding - OAuth Provider Login',
  OnboardingOAuthBYOAServerGetAuthTokens = 'Onboarding - OAuth BYOA Server Get Auth Tokens',
  OnboardingOAuthSeedlessAuthenticate = 'Onboarding - OAuth Seedless Authenticate',
  OnboardingSocialLoginError = 'Onboarding - Social Login Error',
  OnboardingPasswordSetupError = 'Onboarding - Password Setup Error',
  OnboardingPasswordLoginError = 'Onboarding - Password Login Error',
  OnboardingResetPasswordError = 'Onboarding - Reset Password Error',
  OnboardingCreateKeyAndBackupSrpError = 'Onboarding - Create Key and Backup SRP Error',
  OnboardingAddSrpError = 'Onboarding - Add SRP Error',
  OnboardingFetchSrpsError = 'Onboarding - Fetch SRPs Error',
  OnboardingOAuthProviderLoginError = 'Onboarding - OAuth Provider Login Error',
  OnboardingOAuthBYOAServerGetAuthTokensError = 'Onboarding - OAuth BYOA Server Get Auth Tokens Error',
  OnboardingOAuthSeedlessAuthenticateError = 'Onboarding - OAuth Seedless Authenticate Error',
  OnboardingSRPAccountCreationTime = 'Onboarding SRP Account Creation Time',
  OnboardingSRPAccountImportTime = 'Onboarding SRP Account Import Time',
  SwapViewLoaded = 'Swap View Loaded',
  BridgeBalancesUpdated = 'Bridge Balances Updated',
  Card = 'Card',
  // Earn
  EarnDepositScreen = 'Earn Deposit Screen',
  EarnDepositSpendingCapScreen = 'Earn Deposit Spending Cap Screen',
  EarnDepositReviewScreen = 'Earn Deposit Review Screen',
  EarnDepositConfirmationScreen = 'Earn Deposit Confirmation Screen',
  EarnLendingDepositTxConfirmed = 'Earn Lending Deposit Tx Confirmed',
  EarnPooledStakingDepositTxConfirmed = 'Earn Pooled Staking Deposit Tx Confirmed',
  EarnWithdrawScreen = 'Earn Withdraw Screen',
  EarnWithdrawReviewScreen = 'Earn Withdraw Review Screen',
  EarnWithdrawConfirmationScreen = 'Earn Withdraw Confirmation Screen',
  EarnLendingWithdrawTxConfirmed = 'Earn Lending Withdraw Tx Confirmed',
  EarnPooledStakingWithdrawTxConfirmed = 'Earn Pooled Staking Withdraw Tx Confirmed',
  EarnEarnings = 'Earn Earnings',
  EarnFaq = 'Earn FAQ',
  EarnFaqApys = 'Earn FAQ APYs',
  EarnTokenList = 'Earn Token List',
  EarnClaimConfirmationScreen = 'Earn Claim Confirmation Screen',
  EarnPooledStakingClaimTxConfirmed = 'Earn Pooled Staking Claim Tx Confirmed',
  // Accounts
  CreateMultichainAccount = 'Create Multichain Account',
  DiscoverAccounts = 'Discover Accounts',
  ShowAccountAddressList = 'Show Account Address List',
  ShowAccountList = 'Show Account List',
  ShowAccountPrivateKeyList = 'Show Account Private Key List',
  // Perps
  PerpsOpenPosition = 'Perps Open Position',
  PerpsClosePosition = 'Perps Close Position',
  PerpsDeposit = 'Perps Deposit',
  PerpsWithdraw = 'Perps Withdraw',
  PerpsPlaceOrder = 'Perps Place Order',
  PerpsEditOrder = 'Perps Edit Order',
  PerpsCancelOrder = 'Perps Cancel Order',
  PerpsUpdateTPSL = 'Perps Update TP/SL',
  PerpsUpdateMargin = 'Perps Update Margin',
  PerpsFlipPosition = 'Perps Flip Position',
  PerpsOrderSubmissionToast = 'Perps Order Submission Toast',
  PerpsMarketDataUpdate = 'Perps Market Data Update',
  PerpsOrderView = 'Perps Order View',
  PerpsTabView = 'Perps Tab View',
  PerpsMarketListView = 'Perps Market List View',
  PerpsPositionDetailsView = 'Perps Position Details View',
  PerpsAdjustMarginView = 'Perps Adjust Margin View',
  PerpsOrderDetailsView = 'Perps Order Details View',
  PerpsOrderBookView = 'Perps Order Book View',
  PerpsFlipPositionSheet = 'Perps Flip Position Sheet',
  PerpsTransactionsView = 'Perps Transactions View',
  PerpsOrderFillsFetch = 'Perps Order Fills Fetch',
  PerpsOrdersFetch = 'Perps Orders Fetch',
  PerpsFundingFetch = 'Perps Funding Fetch',
  PerpsGetPositions = 'Perps Get Positions',
  PerpsGetAccountState = 'Perps Get Account State',
  PerpsGetHistoricalPortfolio = 'Perps Get Historical Portfolio',
  PerpsGetMarkets = 'Perps Get Markets',
  PerpsFetchHistoricalCandles = 'Perps Fetch Historical Candles',
  PerpsWebSocketConnected = 'Perps WebSocket Connected',
  PerpsWebSocketDisconnected = 'Perps WebSocket Disconnected',
  PerpsWebSocketFirstPositions = 'Perps WebSocket First Positions',
  PerpsWebSocketFirstOrders = 'Perps WebSocket First Orders',
  PerpsWebSocketFirstAccount = 'Perps WebSocket First Account',
  PerpsDataLakeReport = 'Perps Data Lake Report',
  PerpsRewardsAPICall = 'Perps Rewards API Call',
  PerpsClosePositionView = 'Perps Close Position View',
  PerpsWithdrawView = 'Perps Withdraw View',
  PerpsConnectionEstablishment = 'Perps Connection Establishment',
  PerpsAccountSwitchReconnection = 'Perps Account Switch Reconnection',
  // Predict
  PredictFeedView = 'Predict Feed View',
  PredictMarketDetailsView = 'Predict Market Details View',
  PredictBuyPreviewView = 'Predict Buy Preview View',
  PredictSellPreviewView = 'Predict Sell Preview View',
  PredictActivityDetailView = 'Predict Activity Detail View',
  PredictTransactionHistoryView = 'Predict Transaction History View',
  PredictTabView = 'Predict Tab View',
  PredictAddFundsModal = 'Predict Add Funds Modal',
  PredictUnavailableModal = 'Predict Unavailable Modal',
  PredictOrderSubmissionToast = 'Predict Order Submission Toast',
  PredictOrderConfirmationToast = 'Predict Order Confirmation Toast',
  PredictCashoutSubmissionToast = 'Predict Cashout Submission Toast',
  PredictCashoutConfirmationToast = 'Predict Cashout Confirmation Toast',

  // Predict Operations
  PredictPlaceOrder = 'Predict Place Order',
  PredictOrderPreview = 'Predict Order Preview',
  PredictClaim = 'Predict Claim',
  PredictDeposit = 'Predict Deposit',
  PredictWithdraw = 'Predict Withdraw',

  // Predict Data Fetches
  PredictGetMarkets = 'Predict Get Markets',
  PredictGetMarket = 'Predict Get Market',
  PredictGetPositions = 'Predict Get Positions',
  PredictGetActivity = 'Predict Get Activity',
  PredictGetBalance = 'Predict Get Balance',
  PredictGetAccountState = 'Predict Get Account State',
  PredictGetPriceHistory = 'Predict Get Price History',
  PredictGetPrices = 'Predict Get Prices',
  PredictGetUnrealizedPnL = 'Predict Get Unrealized PnL',
}

export enum TraceOperation {
  LoadScripts = 'load.scripts',
  BiometricAuthentication = 'biometrics.authentication',
  AuthenticateUser = 'authenticate.user',
  EngineInitialization = 'engine.initialization',
  StorageRehydration = 'storage.rehydration',
  UIStartup = 'ui.startup',
  NavInit = 'navigation.initialization',
  NetworkSwitch = 'network.switch',
  SwitchBuiltInNetwork = 'switch.to.built.in.network',
  SwitchCustomNetwork = 'switch.to.custom.network',
  VaultCreation = 'login.vault.creation',
  AccountList = 'account.list',
  StoreInit = 'store.initialization',
  Login = 'login',
  ImportAccount = 'import.account',
  CreateAccount = 'create.account',
  CreateSnapAccount = 'create.snap.account',
  RevealPrivateCredential = 'reveal.private.credential',
  DiscoverAccounts = 'discover.accounts',
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  SampleFeatureListPetNames = 'sample.feature.list.pet.names',
  SampleFeatureAddPetName = 'sample.feature.add.pet.name',
  ///: END:ONLY_INCLUDE_IF
  CardGetSupportedTokensAllowances = 'card.get.supported.tokens.allowances',
  CardGetPriorityToken = 'card.get.priority.token',
  CardIdentifyCardholder = 'card.identify.cardholder',
  OnboardingUserJourney = 'onboarding.user_journey',
  OnboardingSecurityOp = 'onboarding.security_operation',
  OnboardingError = 'onboarding.error',
  // Accounts
  AccountCreate = 'account.create',
  AccountDiscover = 'account.discover',
  AccountUi = 'account.ui',
  // Perps
  PerpsOperation = 'perps.operation',
  PerpsMarketData = 'perps.market_data',
  PerpsOrderSubmission = 'perps.order_submission',
  PerpsPositionManagement = 'perps.position_management',
  // Predict
  PredictOperation = 'predict.operation',
  PredictOrderSubmission = 'predict.order_submission',
  PredictDataFetch = 'predict.data_fetch',
}

const ID_DEFAULT = 'default';
const OP_DEFAULT = 'custom';
export const TRACES_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

const tracesByKey: Map<string, PendingTrace> = new Map();

const localBufferedTraces: BufferedTrace[] = [];

export interface PendingTrace {
  end: (timestamp?: number) => void;
  request: TraceRequest;
  startTime: number;
  timeoutId: NodeJS.Timeout;
  span?: Span;
}
/**
 * A context object to associate traces with each other and generate nested traces.
 * When trace() is called without a callback, it returns a Span that can be manually ended.
 */
export type TraceContext = Span | undefined;
/**
 * A callback function that can be traced.
 */
export type TraceCallback<T> = (context?: TraceContext) => T;

/**
 * Type alias for trace attribute values.
 */
export type TraceValue = number | string | boolean;

/**
 * A request to create a new trace.
 */
export interface TraceRequest {
  /**
   * Custom data to associate with the trace.
   */
  data?: Record<string, TraceValue>;

  /**
   * A unique identifier when not tracing a callback.
   * Defaults to 'default' if not provided.
   */
  id?: string;

  /**
   * The name of the trace.
   */
  name: TraceName;

  /**
   * The parent context of the trace.
   * If provided, the trace will be nested under the parent trace.
   */
  parentContext?: TraceContext;

  /**
   * Override the start time of the trace.
   */
  startTime?: number;

  /**
   * Custom tags to associate with the trace.
   */
  tags?: Record<string, TraceValue>;
  /**
   * Custom operation name to associate with the trace.
   */
  op?: string;
}
/**
 * A request to end a pending trace.
 */
export interface EndTraceRequest {
  /**
   * The unique identifier of the trace.
   * Defaults to 'default' if not provided.
   */
  id?: string;

  /**
   * The name of the trace.
   */
  name: TraceName;

  /**
   * Override the end time of the trace.
   */
  timestamp?: number;

  /**
   * Custom data to associate with the trace when ending it.
   * These will be set as attributes on the span.
   */
  data?: Record<string, TraceValue>;
}

interface SentrySpanWithName extends Span {
  _name?: string;
}

interface BufferedTrace<T = TraceRequest | EndTraceRequest> {
  type: 'start' | 'end';
  request: T;
  parentTraceName?: string; // Track parent trace name for reconnecting during flush
}

export function trace<T>(request: TraceRequest, fn: TraceCallback<T>): T;

export function trace(request: TraceRequest): TraceContext;

/**
 * Create a Sentry transaction to analyse the duration of a code flow.
 * If a callback is provided, the transaction will be automatically ended when the callback completes.
 * If the callback returns a promise, the transaction will be ended when the promise resolves or rejects.
 * If no callback is provided, the transaction must be manually ended using `endTrace`.
 *
 * @param request - The data associated with the trace, such as the name and tags.
 * @param fn - The optional callback to record the duration of.
 * @returns The context of the trace, or the result of the callback if provided.
 */
export function trace<T>(
  request: TraceRequest,
  fn?: TraceCallback<T>,
): T | TraceContext {
  if (!fn) {
    return startTrace(request);
  }

  return traceCallback(request, fn);
}

/**
 * End a pending trace that was started without a callback.
 * Does nothing if the pending trace cannot be found.
 *
 * @param request - The data necessary to identify and end the pending trace.
 */
export function endTrace(request: EndTraceRequest): void {
  const { name, timestamp } = request;
  const id = getTraceId(request);

  if (getCachedConsent() !== true) {
    bufferTraceEndCallLocal(request);
    return;
  }

  const key = getTraceKey(request);
  const pendingTrace = tracesByKey.get(key);

  if (!pendingTrace) {
    log('No pending trace found', name, id);
    return;
  }

  if (request.data && pendingTrace.span) {
    const span = pendingTrace.span as Span;
    for (const [attrKey, attrValue] of Object.entries(request.data)) {
      span.setAttribute(attrKey, attrValue);
    }
  }

  pendingTrace.end(timestamp);

  clearTimeout(pendingTrace.timeoutId);
  tracesByKey.delete(key);

  const { request: pendingRequest, startTime } = pendingTrace;
  const endTime = timestamp ?? getPerformanceTimestamp();
  const duration = endTime - startTime;

  log('Finished trace', name, id, duration, { request: pendingRequest });
}

/**
 * Create a buffered trace object for start trace requests
 */
function createBufferedStartTrace(
  request: TraceRequest,
  parentTraceName?: string,
): BufferedTrace {
  return {
    type: 'start',
    request: {
      ...request,
      parentContext: undefined, // Remove original parentContext to avoid invalid references
      startTime: request.startTime ?? Date.now(),
    },
    parentTraceName,
  } as BufferedTrace;
}

/**
 * Create a buffered trace object for end trace requests
 */
function createBufferedEndTrace(request: EndTraceRequest): BufferedTrace {
  return {
    type: 'end',
    request: {
      ...request,
      timestamp: request.timestamp ?? Date.now(),
    },
  } as BufferedTrace;
}

/**
 * Buffer a trace start call in local memory
 */
export function bufferTraceStartCallLocal(
  request: TraceRequest,
  parentTraceName?: string,
) {
  localBufferedTraces.push(createBufferedStartTrace(request, parentTraceName));
}

/**
 * Buffer a trace end call in local memory
 */
export function bufferTraceEndCallLocal(request: EndTraceRequest) {
  localBufferedTraces.push(createBufferedEndTrace(request));
}

/**
 * Flushes buffered traces to Sentry when consent is given
 */
export async function flushBufferedTraces() {
  const localBufferedTracesCopy = [...localBufferedTraces];

  if (localBufferedTracesCopy.length === 0) {
    return;
  }

  localBufferedTraces.length = 0;
  const activeSpans = new Map<string, Span>();

  for (const bufferedItem of localBufferedTracesCopy) {
    if (bufferedItem.type === 'start') {
      const traceKey = getTraceKey(bufferedItem.request);

      // Get parent if applicable
      let parentSpan: Span | undefined;
      if (bufferedItem.parentTraceName) {
        // Find parent span by iterating through active spans with matching name
        for (const [key, span] of activeSpans.entries()) {
          const [spanName] = key.split(':');
          if (spanName === bufferedItem.parentTraceName) {
            parentSpan = span;
            break;
          }
        }
      }

      const span = trace({
        ...bufferedItem.request,
        parentContext: parentSpan,
      }) as Span;

      if (span) {
        activeSpans.set(traceKey, span);
      }
    } else if (bufferedItem.type === 'end') {
      endTrace(bufferedItem.request);
      const traceKey = getTraceKey(bufferedItem.request);
      activeSpans.delete(traceKey);
    }
  }
}

// Cache consent state to avoid async checks in trace functions
// Default to null to indicate not yet loaded (traces will be buffered)
let cachedConsent: boolean | null = null;

/**
 * Check if user has given consent for metrics
 */
export async function hasMetricsConsent(): Promise<boolean> {
  const metricsOptIn = await StorageWrapper.getItem(METRICS_OPT_IN);
  const hasConsent = metricsOptIn === AGREED;
  cachedConsent = hasConsent;
  return hasConsent;
}

/**
 * Get cached consent state synchronously
 * Note: When null, traces are buffered to ensure we don't accidentally send data before consent is checked
 */
function getCachedConsent(): boolean | null {
  return cachedConsent;
}

/**
 * Update cached consent state
 * @param {boolean} consent - new consent state
 */
export function updateCachedConsent(consent: boolean) {
  cachedConsent = consent;
}

export function discardBufferedTraces() {
  localBufferedTraces.length = 0; // Clear local buffer as well
}

function traceCallback<T>(request: TraceRequest, fn: TraceCallback<T>): T {
  const { name } = request;

  if (getCachedConsent() !== true) {
    // Extract parent trace name if parentContext exists
    let parentTraceName: string | undefined;
    if (request.parentContext && typeof request.parentContext === 'object') {
      const parentSpan = request.parentContext as SentrySpanWithName;
      parentTraceName = parentSpan._name;
    }

    bufferTraceStartCallLocal(request, parentTraceName);
    const result = fn(undefined);
    bufferTraceEndCallLocal({
      name: request.name,
      id: request.id,
    });
    return result;
  }

  const callback = (span: Span | undefined) => {
    log('Starting trace', name, request);

    const start = Date.now();
    let error: unknown;

    if (span) {
      initSpan(span, request);
    }

    return tryCatchMaybePromise<T>(
      () => fn(span),
      (currentError) => {
        error = currentError;
        throw currentError;
      },
      () => {
        const end = Date.now();
        const duration = end - start;

        log('Finished trace', name, duration, { error, request });
      },
    ) as T;
  };

  return startSpan(request, (spanOptions) =>
    sentryStartSpan(spanOptions, callback),
  );
}

function startTrace(request: TraceRequest): TraceContext {
  const { name, startTime: requestStartTime } = request;
  const startTime = requestStartTime ?? getPerformanceTimestamp();
  const id = getTraceId(request);

  if (getCachedConsent() !== true) {
    // Extract parent trace name if parentContext exists
    let parentTraceName: string | undefined;
    if (request.parentContext && typeof request.parentContext === 'object') {
      const parentSpan = request.parentContext as SentrySpanWithName;
      parentTraceName = parentSpan._name;
    }

    bufferTraceStartCallLocal(request, parentTraceName);
    return undefined;
  }

  const callback = (span: Span | undefined) => {
    const end = (timestamp?: number) => {
      if (span?.end !== undefined) {
        span?.end(timestamp);
      }
    };

    if (span) {
      initSpan(span, request);
    }

    const timeoutId = setTimeout(() => {
      log('Trace cleanup due to timeout', name, id);
      end();
      tracesByKey.delete(getTraceKey(request));
    }, TRACES_CLEANUP_INTERVAL);

    const pendingTrace = { end, request, startTime, timeoutId, span };
    const key = getTraceKey(request);
    tracesByKey.set(key, pendingTrace);

    log('Started trace', name, id, request);

    return span;
  };

  return startSpan(request, (spanOptions) =>
    startSpanManual(spanOptions, callback),
  );
}

function startSpan<T>(
  request: TraceRequest,
  callback: (spanOptions: StartSpanOptions) => T,
) {
  const { data: attributes, name, parentContext, startTime, op } = request;
  const parentSpan = (parentContext ?? null) as Span | null;

  const spanOptions: StartSpanOptions = {
    attributes,
    name,
    op: op || OP_DEFAULT,
    parentSpan,
    startTime,
  };

  return withIsolationScope((scope) => {
    setScopeTags(scope, request);

    return callback(spanOptions);
  }) as T;
}

function getTraceId(request: TraceRequest | EndTraceRequest) {
  return request.id ?? ID_DEFAULT;
}

function getTraceKey(request: TraceRequest | EndTraceRequest) {
  const { name } = request;
  const id = getTraceId(request);

  return [name, id].join(':');
}

/**
 * Initialise the isolated Sentry scope created for each trace.
 * Includes setting all non-numeric tags.
 *
 * @param scope - The Sentry scope to initialise.
 * @param request - The trace request.
 */
function setScopeTags(scope: Scope, request: TraceRequest) {
  const tags = request.tags ?? {};

  for (const [key, value] of Object.entries(tags)) {
    if (typeof value !== 'number') {
      scope.setTag(key, value);
    }
  }
}

/**
 * Initialise the Sentry span created for each trace.
 * Includes setting all numeric tags as measurements so they can be queried numerically in Sentry.
 *
 * @param _span - The Sentry span to initialise.
 * @param request - The trace request.
 */
function initSpan(_span: Span, request: TraceRequest) {
  const tags = request.tags ?? {};

  for (const [key, value] of Object.entries(tags)) {
    if (typeof value === 'number') {
      setMeasurement(key, value, 'none');
    }
  }
}

function getPerformanceTimestamp(): number {
  return performance.timeOrigin + performance.now();
}

function tryCatchMaybePromise<T>(
  tryFn: () => T,
  catchFn: (error: unknown) => void,
  finallyFn: () => void,
): T | undefined {
  let isPromise = false;

  try {
    const result = tryFn() as T;

    if (result instanceof Promise) {
      isPromise = true;
      return result.catch(catchFn).finally(finallyFn) as T;
    }

    return result;
  } catch (error) {
    if (!isPromise) {
      catchFn(error);
    }
  } finally {
    if (!isPromise) {
      finallyFn();
    }
  }

  return undefined;
}
